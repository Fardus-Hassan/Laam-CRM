import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  OrderPaymentListQuery,
  OrderPaymentListResponse,
  OrderPaymentMethod,
  OrderPaymentRecord,
  OrderPaymentRecordStatus,
} from '@laam/types';

import type { ActorLabel } from '../common/actor.util';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from './accounting.service';

const METHODS = new Set(['cod', 'bkash', 'nagad', 'bank', 'cash']);

@Injectable()
export class OrderPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
  ) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) throw new BadRequestException('Organization required');
  }

  async list(
    organizationId: string,
    query: Partial<OrderPaymentListQuery> & { page?: number; pageSize?: number },
  ): Promise<OrderPaymentListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = { organizationId };

    if (query.status) where.status = query.status;
    if (query.method) where.method = query.method;

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.order = {
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerPhone: { contains: q } },
        ],
      };
    }

    const dateFilter = resolvePaymentDateFilter(query.dateRange);
    if (dateFilter) where.createdAt = dateFilter;

    const [total, rows] = await Promise.all([
      this.prisma.orderPayment.count({ where }),
      this.prisma.orderPayment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              amount: true,
              paidAmount: true,
            },
          },
        },
      }),
    ]);

    const items = rows.map((row) => this.toRecord(row));

    // Summary over full filtered set (not just page)
    const allForSummary = await this.prisma.orderPayment.findMany({
      where,
      include: {
        order: { select: { amount: true, paidAmount: true } },
      },
    });
    let totalCollected = 0;
    let totalPending = 0;
    for (const row of allForSummary) {
      const paid = Math.max(row.collectedAmount, row.order.paidAmount ?? 0);
      const due = Math.max(0, row.order.amount - paid);
      totalCollected += paid;
      totalPending += due;
    }

    return {
      items,
      total,
      page,
      pageSize,
      summary: {
        totalCollected,
        totalPending,
        recordCount: total,
      },
    };
  }

  async reconcile(
    organizationId: string,
    paymentId: string,
    actor?: ActorLabel,
  ): Promise<OrderPaymentRecord> {
    const row = await this.prisma.orderPayment.findFirst({
      where: { id: paymentId, organizationId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            amount: true,
            paidAmount: true,
            paymentMethod: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Payment not found');

    const now = new Date();
    const amount = row.order.amount;
    const previousPaid = Math.max(0, row.order.paidAmount ?? 0);
    const delta = Math.round((amount - previousPaid) * 100) / 100;
    const method = normalizeMethod(row.method || row.order.paymentMethod);

    if (delta > 0) {
      await this.accounting.postOrderCollection(organizationId, {
        orderId: row.orderId,
        orderNumber: row.order.orderNumber,
        amount: delta,
        paidTo: amount,
        paymentMethod: method,
      });
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.orderPayment.update({
        where: { id: row.id },
        data: {
          status: 'reconciled',
          method,
          collectedAmount: amount,
          collectedAt: row.collectedAt ?? now,
          reconciledAt: now,
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              amount: true,
              paidAmount: true,
            },
          },
        },
      }),
      this.prisma.order.update({
        where: { id: row.orderId },
        data: {
          paidAmount: amount,
          paymentStatus: 'paid',
          paymentMethod: method,
        },
      }),
      this.prisma.orderActivity.create({
        data: {
          organizationId,
          orderId: row.orderId,
          type: 'note',
          label: 'Payment reconciled',
          description: `Full amount ${amount} marked reconciled (posted to ledger)`,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? null,
        },
      }),
    ]);

    return this.toRecord({
      ...updated,
      order: { ...updated.order, paidAmount: amount },
    });
  }

  /** Ensure a payment tracking row exists; sync collected amount from order. */
  async ensureForOrder(
    organizationId: string,
    order: {
      id: string;
      amount: number;
      paidAmount: number;
      paymentStatus: string;
      paymentMethod?: string | null;
    },
    actor?: ActorLabel,
  ): Promise<void> {
    const method = normalizeMethod(order.paymentMethod);
    const paid = Math.max(0, order.paidAmount ?? 0);
    const status = deriveStatus(order.amount, paid, order.paymentStatus);
    const now = new Date();

    await this.prisma.orderPayment.upsert({
      where: {
        organizationId_orderId: { organizationId, orderId: order.id },
      },
      create: {
        organizationId,
        orderId: order.id,
        method,
        status,
        collectedAmount: paid,
        collectedAt: paid > 0 ? now : null,
        reconciledAt: status === 'reconciled' ? now : null,
        createdByUserId: actor?.userId ?? null,
        createdByName: actor?.name ?? null,
      },
      update: {
        method,
        status,
        collectedAmount: paid,
        collectedAt: paid > 0 ? now : null,
        reconciledAt: status === 'reconciled' ? now : null,
      },
    });
  }

  async recordCollection(
    organizationId: string,
    orderId: string,
    input: { amount: number; method?: string; note?: string },
    actor?: ActorLabel,
  ): Promise<OrderPaymentRecord> {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const previousPaid = Math.max(0, order.paidAmount);
    const nextPaid = Math.min(order.amount, previousPaid + amount);
    const delta = Math.round((nextPaid - previousPaid) * 100) / 100;
    if (delta <= 0) {
      throw new BadRequestException('Nothing left to collect on this order');
    }

    const paymentStatus =
      nextPaid >= order.amount ? 'paid' : nextPaid > 0 ? 'partial' : 'cod';
    const method = normalizeMethod(input.method ?? order.paymentMethod);
    const status = deriveStatus(order.amount, nextPaid, paymentStatus);
    const now = new Date();

    // Ledger first (idempotent) so ops + books stay aligned on retry.
    await this.accounting.postOrderCollection(organizationId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: delta,
      paidTo: nextPaid,
      paymentMethod: method,
    });

    const [, payment] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          paidAmount: nextPaid,
          paymentStatus,
          paymentMethod: method,
        },
      }),
      this.prisma.orderPayment.upsert({
        where: {
          organizationId_orderId: { organizationId, orderId: order.id },
        },
        create: {
          organizationId,
          orderId: order.id,
          method,
          status,
          collectedAmount: nextPaid,
          note: input.note?.trim() || null,
          collectedAt: now,
          reconciledAt: status === 'reconciled' ? now : null,
          createdByUserId: actor?.userId ?? null,
          createdByName: actor?.name ?? null,
        },
        update: {
          method,
          status,
          collectedAmount: nextPaid,
          note: input.note?.trim() || undefined,
          collectedAt: now,
          reconciledAt: status === 'reconciled' ? now : null,
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              amount: true,
              paidAmount: true,
            },
          },
        },
      }),
      this.prisma.orderActivity.create({
        data: {
          organizationId,
          orderId: order.id,
          type: 'note',
          label: 'Payment collected',
          description: `+${delta} via ${method}${input.note ? ` — ${input.note}` : ''} (posted to ledger)`,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? null,
        },
      }),
    ]);

    return this.toRecord({
      ...payment,
      order: {
        ...payment.order,
        paidAmount: nextPaid,
      },
    });
  }

  private toRecord(row: {
    id: string;
    method: string;
    status: string;
    collectedAmount: number;
    collectedAt: Date | null;
    createdAt: Date;
    order: {
      id: string;
      orderNumber: string;
      customerName: string;
      amount: number;
      paidAmount: number;
    };
  }): OrderPaymentRecord {
    const paid = Math.max(row.collectedAmount, row.order.paidAmount ?? 0);
    const due = Math.max(0, row.order.amount - paid);
    return {
      id: row.id,
      orderId: row.order.id,
      orderNumber: row.order.orderNumber,
      customerName: row.order.customerName,
      amount: row.order.amount,
      paid,
      due,
      method: (METHODS.has(row.method) ? row.method : 'cod') as OrderPaymentMethod,
      status: row.status as OrderPaymentRecordStatus,
      collectedAt: row.collectedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }
}

function normalizeMethod(raw?: string | null): OrderPaymentMethod {
  const m = (raw ?? 'cod').trim().toLowerCase();
  if (METHODS.has(m)) return m as OrderPaymentMethod;
  if (m === 'paid' || m === 'partial') return 'cod';
  return 'cod';
}

function deriveStatus(
  orderAmount: number,
  paid: number,
  paymentStatus: string,
): OrderPaymentRecordStatus {
  if (paymentStatus === 'paid' || (orderAmount > 0 && paid >= orderAmount)) {
    return 'reconciled';
  }
  if (paid > 0) return 'collected';
  return 'pending';
}

function resolvePaymentDateFilter(
  dateRange?: string,
): { gte?: Date } | undefined {
  if (!dateRange || dateRange === 'all_time') return undefined;
  const now = new Date();
  if (dateRange === 'last_30') {
    const gte = new Date(now);
    gte.setDate(gte.getDate() - 29);
    gte.setHours(0, 0, 0, 0);
    return { gte };
  }
  if (dateRange === 'this_month') {
    return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  return undefined;
}
