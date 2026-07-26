import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateOrderPayload,
  EnqueueFailedOrderPayload,
  FailedOrderListItem,
  FailedOrderListQuery,
  FailedOrderListResponse,
  FailedOrderType,
} from '@laam/types';
import type { Prisma } from '@prisma/client';

import type { ActorLabel } from '../common/actor.util';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService, type CreateOrderInput } from './orders.service';

const RETENTION_DAYS = 90;
const REPORT_DAYS = 30;
const FAILED_TYPES = new Set<FailedOrderType>(['duplicate', 'blocked', 'other']);

@Injectable()
export class FailedOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) throw new BadRequestException('Organization required');
  }

  private retentionCutoff(): Date {
    return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  }

  private reportCutoff(): Date {
    return new Date(Date.now() - REPORT_DAYS * 24 * 60 * 60 * 1000);
  }

  async countPending(organizationId: string): Promise<number> {
    return this.prisma.failedOrder.count({
      where: {
        organizationId,
        queueStatus: 'pending',
        createdAt: { gte: this.retentionCutoff() },
      },
    });
  }

  async list(
    organizationId: string,
    query: Partial<FailedOrderListQuery> & { page?: number; pageSize?: number },
  ): Promise<FailedOrderListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.FailedOrderWhereInput = {
      organizationId,
      queueStatus: 'pending',
      createdAt: { gte: this.retentionCutoff() },
    };

    const andFilters: Prisma.FailedOrderWhereInput[] = [];

    if (query.failedType && FAILED_TYPES.has(query.failedType)) {
      where.failedType = query.failedType;
    }
    if (query.website && query.website !== 'all') {
      where.website = query.website;
    }
    if (query.noteStatus === 'has_note') {
      andFilters.push({
        lastUpdateNote: { not: null },
        NOT: { lastUpdateNote: '' },
      });
    } else if (query.noteStatus === 'no_note') {
      andFilters.push({
        OR: [{ lastUpdateNote: null }, { lastUpdateNote: '' }],
      });
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      andFilters.push({
        OR: [
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerPhone: { contains: q } },
          { address: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const reportFrom = this.reportCutoff();
    const [total, rows, totalTracked, confirmed, websiteRows] = await Promise.all([
      this.prisma.failedOrder.count({ where }),
      this.prisma.failedOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.failedOrder.count({
        where: { organizationId, createdAt: { gte: reportFrom } },
      }),
      this.prisma.failedOrder.count({
        where: {
          organizationId,
          queueStatus: 'recovered',
          recoveredAt: { gte: reportFrom },
        },
      }),
      this.prisma.failedOrder.findMany({
        where: {
          organizationId,
          queueStatus: 'pending',
          createdAt: { gte: this.retentionCutoff() },
          website: { not: null },
        },
        select: { website: true },
        distinct: ['website'],
      }),
    ]);

    const percent =
      totalTracked > 0 ? Math.round((confirmed / totalTracked) * 10000) / 100 : 0;

    return {
      items: rows.map((row) => this.toListItem(row)),
      total,
      page,
      pageSize,
      report: {
        totalTracked,
        confirmed,
        failedToConfirmedPercent: percent,
      },
      websites: websiteRows
        .map((r) => r.website)
        .filter((w): w is string => Boolean(w?.trim()))
        .sort(),
    };
  }

  async enqueue(
    organizationId: string,
    input: EnqueueFailedOrderPayload,
    actor?: ActorLabel,
  ): Promise<FailedOrderListItem> {
    if (!input.lineItems?.length) {
      throw new BadRequestException('At least one line item is required');
    }
    if (!input.customerName?.trim() || !input.customerPhone?.trim()) {
      throw new BadRequestException('Customer name and phone are required');
    }
    if (!input.shippingAddress?.trim()) {
      throw new BadRequestException('Shipping address is required');
    }

    const phone = input.customerPhone.trim();
    let failedType: FailedOrderType =
      input.failedType && FAILED_TYPES.has(input.failedType) ? input.failedType : 'other';

    if (failedType === 'other' || !input.failedType) {
      const dup = await this.orders.checkDuplicate(organizationId, phone);
      if (dup.isDuplicate) {
        failedType = 'duplicate';
      }
    }

    const products = input.lineItems.map((l) => l.productName).filter(Boolean);
    const address = input.shippingAddress.trim();
    const payload = this.toCreatePayload(input);

    const row = await this.prisma.failedOrder.create({
      data: {
        organizationId,
        customerName: input.customerName.trim(),
        customerPhone: phone,
        address,
        products,
        queueStatus: 'pending',
        failedType,
        website: input.website?.trim() || null,
        lastUpdateNote: input.lastUpdateNote?.trim() || null,
        payload: payload as unknown as Prisma.InputJsonValue,
        createdByUserId: actor?.userId ?? null,
        createdByName: actor?.name ?? null,
      },
    });

    return this.toListItem(row);
  }

  async retry(
    organizationId: string,
    id: string,
    actor: ActorLabel,
  ): Promise<{ success: boolean; message: string; orderId?: string; orderNumber?: string }> {
    const row = await this.prisma.failedOrder.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Failed order not found');
    if (row.queueStatus !== 'pending') {
      throw new BadRequestException(`Cannot retry — status is ${row.queueStatus}`);
    }

    const payload = row.payload as unknown as CreateOrderInput;
    if (!payload?.lineItems?.length) {
      throw new BadRequestException('Stored payload is incomplete — cannot retry');
    }

    const created = await this.orders.create(
      organizationId,
      {
        ...payload,
        customerName: payload.customerName || row.customerName,
        customerPhone: payload.customerPhone || row.customerPhone,
        shippingAddress: payload.shippingAddress || row.address,
        status: payload.status || 'pending',
        source: payload.source || 'website',
      },
      actor,
    );

    await this.prisma.failedOrder.update({
      where: { id: row.id },
      data: {
        queueStatus: 'recovered',
        recoveredOrderId: created.id,
        recoveredAt: new Date(),
        lastUpdateNote: `Recovered as ${created.orderNumber}`,
      },
    });

    return {
      success: true,
      message: `Order ${created.orderNumber} created from failed intake`,
      orderId: created.id,
      orderNumber: created.orderNumber,
    };
  }

  async dismiss(organizationId: string, id: string): Promise<{ success: boolean }> {
    const row = await this.prisma.failedOrder.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Failed order not found');
    if (row.queueStatus !== 'pending') {
      throw new BadRequestException(`Cannot dismiss — status is ${row.queueStatus}`);
    }

    await this.prisma.failedOrder.update({
      where: { id: row.id },
      data: {
        queueStatus: 'dismissed',
        dismissedAt: new Date(),
      },
    });

    return { success: true };
  }

  private toCreatePayload(input: EnqueueFailedOrderPayload): CreateOrderPayload {
    const {
      failedType: _ft,
      website: _w,
      lastUpdateNote: _n,
      ...rest
    } = input;
    return {
      ...rest,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      shippingAddress: input.shippingAddress.trim(),
      shippingArea: input.shippingArea || input.district || '',
      source: input.source || 'website',
      status: input.status || 'pending',
      deliveryCharge: input.deliveryCharge ?? 0,
      discount: input.discount ?? 0,
      lineItems: input.lineItems,
    };
  }

  private toListItem(row: {
    id: string;
    customerName: string;
    customerPhone: string;
    address: string;
    products: string[];
    queueStatus: string;
    failedType: string;
    website: string | null;
    lastUpdateNote: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): FailedOrderListItem {
    const status =
      row.queueStatus === 'recovered'
        ? 'confirmed'
        : row.queueStatus === 'dismissed'
          ? 'canceled'
          : 'pending';

    return {
      id: row.id,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      address: row.address,
      products: row.products ?? [],
      status,
      failedType: (FAILED_TYPES.has(row.failedType as FailedOrderType)
        ? row.failedType
        : 'other') as FailedOrderType,
      website: row.website ?? undefined,
      lastUpdateNote: row.lastUpdateNote ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
