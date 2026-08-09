import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CourierAccount,
  CourierInboxEvent,
  CourierOverview,
  CourierProvider,
  CourierSubmitItem,
} from '@laam/types';

import type { ActorLabel } from '../common/actor.util';
import { PrismaService } from '../prisma/prisma.service';
import { CourierIntegrationsService } from './courier-integrations.service';
import { OrdersService } from './orders.service';
import { NotificationsService } from './notifications.service';

const READY_STATUSES = new Set([
  'pending',
  'pending_2',
  'pending_3',
  'confirmed',
  'processing',
  'processing_2',
]);
const IN_TRANSIT_STATUSES = new Set(['in_courier', 'processing', 'processing_2']);
const DELIVERED_STATUSES = new Set(['delivered', 'completed']);
const FAILED_STATUSES = new Set(['cancelled', 'returned', 'rts_carrybee', 'failed']);

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function maskSecret(value?: string | null): string | undefined {
  const v = (value ?? '').trim();
  if (!v) return undefined;
  if (v.length <= 4) return '••••';
  return `${v.slice(0, 2)}••••${v.slice(-3)}`;
}

@Injectable()
export class CourierHubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: CourierIntegrationsService,
    @Inject(forwardRef(() => OrdersService))
    private readonly orders: OrdersService,
    private readonly notifications: NotificationsService,
  ) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization required');
    }
  }

  /** Sidebar badge: orders ready to book with a courier. */
  async readyCount(organizationId: string): Promise<number> {
    const rows = await this.prisma.order.findMany({
      where: this.readyWhere(organizationId),
      select: { shippingAddress: true },
      take: 500,
    });
    return rows.filter((r) => (r.shippingAddress?.trim().length ?? 0) >= 10).length;
  }

  async getOverview(
    organizationId: string,
    userId?: string | null,
  ): Promise<CourierOverview> {
    const today = startOfTodayUtc();
    const [pathao, carrybee, readyRows, bookedToday, inTransit, deliveredToday, failedToday, recentBooked] =
      await Promise.all([
        this.integrations.getPathaoPublic(organizationId),
        this.integrations.getCarrybeePublic(organizationId),
        this.prisma.order.findMany({
          where: this.readyWhere(organizationId),
          orderBy: { createdAt: 'desc' },
          take: 150,
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            district: true,
            shippingArea: true,
            shippingAddress: true,
            amount: true,
            status: true,
          },
        }),
        this.prisma.order.count({
          where: {
            organizationId,
            deletedAt: null,
            courierBookedAt: { gte: today },
          },
        }),
        this.prisma.order.count({
          where: {
            organizationId,
            deletedAt: null,
            courierConsignmentId: { not: null },
            status: { in: [...IN_TRANSIT_STATUSES] },
          },
        }),
        this.prisma.order.count({
          where: {
            organizationId,
            deletedAt: null,
            status: { in: [...DELIVERED_STATUSES] },
            OR: [
              { courierStatusSyncedAt: { gte: today } },
              { updatedAt: { gte: today }, courierConsignmentId: { not: null } },
            ],
          },
        }),
        this.prisma.order.count({
          where: {
            organizationId,
            deletedAt: null,
            status: { in: [...FAILED_STATUSES] },
            courierConsignmentId: { not: null },
            updatedAt: { gte: today },
          },
        }),
        this.prisma.order.findMany({
          where: {
            organizationId,
            deletedAt: null,
            courierConsignmentId: { not: null },
          },
          orderBy: [{ courierStatusSyncedAt: 'desc' }, { courierBookedAt: 'desc' }],
          take: 40,
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            status: true,
            courierProvider: true,
            courierConsignmentId: true,
            courierStatus: true,
            courierStatusSlug: true,
            courierBookedAt: true,
            courierStatusSyncedAt: true,
            paymentStatus: true,
            paymentMethod: true,
            amount: true,
            paidAmount: true,
          },
        }),
      ]);

    const pathaoConnected = pathao.enabled && pathao.hasCredentials;
    const carrybeeConnected = carrybee.enabled && carrybee.hasCredentials;
    const defaultProvider: CourierProvider = pathaoConnected
      ? 'pathao'
      : carrybeeConnected
        ? 'carrybee'
        : 'pathao';

    const accounts: CourierAccount[] = [];
    if (pathaoConnected || pathao.hasCredentials || pathao.enabled) {
      accounts.push({
        id: 'pathao',
        provider: 'pathao',
        label: pathao.environment === 'live' ? 'Pathao Live' : 'Pathao Sandbox',
        status: !pathaoConnected
          ? 'inactive'
          : pathao.lastError
            ? 'error'
            : 'active',
        isDefault: defaultProvider === 'pathao',
        apiKeyMasked: maskSecret(pathao.clientIdMasked ?? (pathao.storeId != null ? String(pathao.storeId) : null)),
        lastSyncAt: pathao.lastSyncAt ?? undefined,
        consignmentsToday: await this.consignmentsToday(organizationId, 'pathao', today),
        successRate: await this.successRate(organizationId, 'pathao'),
      });
    }
    if (carrybeeConnected || carrybee.hasCredentials || carrybee.enabled) {
      accounts.push({
        id: 'carrybee',
        provider: 'carrybee',
        label: carrybee.environment === 'live' ? 'Carrybee Live' : 'Carrybee Sandbox',
        status: !carrybeeConnected
          ? 'inactive'
          : carrybee.lastError
            ? 'error'
            : 'active',
        isDefault: defaultProvider === 'carrybee',
        apiKeyMasked: maskSecret(
          carrybee.clientIdMasked ?? (carrybee.storeId != null ? String(carrybee.storeId) : null),
        ),
        lastSyncAt: carrybee.lastSyncAt ?? undefined,
        consignmentsToday: await this.consignmentsToday(organizationId, 'carrybee', today),
        successRate: await this.successRate(organizationId, 'carrybee'),
      });
    }

    const readyToSubmit: CourierSubmitItem[] = readyRows
      .filter((row) => (row.shippingAddress?.trim().length ?? 0) >= 10)
      .slice(0, 100)
      .map((row) => ({
        orderId: row.id,
        orderNumber: row.orderNumber,
        customerName: row.customerName,
        district: row.district || row.shippingArea || '—',
        amountBdt: row.amount,
        status: 'ready' as const,
      }));

    const inboxBase = recentBooked.map((row) => this.toInboxEvent(row));
    let readIds = new Set<string>();
    if (userId && inboxBase.length > 0) {
      const reads = await this.prisma.courierInboxRead.findMany({
        where: {
          organizationId,
          userId,
          eventId: { in: inboxBase.map((e) => e.id) },
        },
        select: { eventId: true },
      });
      readIds = new Set(reads.map((r) => r.eventId));
    }
    const inbox: CourierInboxEvent[] = inboxBase.map((ev) => ({
      ...ev,
      isRead: userId ? readIds.has(ev.id) : true,
    }));

    return {
      accounts,
      rules: {
        defaultProvider,
        codEnabled: true,
        codChargePercent: 0,
        autoSubmitOnConfirm: false,
      },
      inbox,
      readyToSubmit,
      stats: {
        submittedToday: bookedToday,
        inTransit,
        deliveredToday,
        failedToday,
      },
    };
  }

  async submitOrders(
    organizationId: string,
    orderIds: string[],
    providerInput: string | undefined,
    actor: ActorLabel,
  ): Promise<{ submitted: number; failed: number; message: string }> {
    const ids = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))];
    if (!ids.length) {
      throw new BadRequestException('Select at least one order');
    }

    const overview = await this.getOverview(organizationId);
    const provider = (providerInput || overview.rules.defaultProvider)
      .trim()
      .toLowerCase();
    if (provider !== 'pathao' && provider !== 'carrybee') {
      throw new BadRequestException('Provider must be pathao or carrybee');
    }

    let submitted = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const id of ids) {
      try {
        if (provider === 'pathao') {
          await this.orders.bookWithPathao(organizationId, id, actor);
        } else {
          await this.orders.bookWithCarrybee(organizationId, id, actor);
        }
        submitted += 1;
      } catch (e) {
        failed += 1;
        const msg = e instanceof Error ? e.message : 'Book failed';
        if (errors.length < 5) errors.push(msg);
      }
    }

    const detail = errors.length ? ` · ${errors.join(' · ')}` : '';
    return {
      submitted,
      failed,
      message: `Booked ${submitted}/${ids.length} via ${provider}${detail}`,
    };
  }

  async markInboxRead(
    organizationId: string,
    eventId: string,
    userId: string,
  ): Promise<{ ok: true }> {
    const id = eventId.trim();
    if (!id) throw new BadRequestException('eventId required');
    if (!userId?.trim()) throw new BadRequestException('userId required');

    await this.prisma.courierInboxRead.upsert({
      where: {
        organizationId_userId_eventId: {
          organizationId,
          userId,
          eventId: id,
        },
      },
      create: { organizationId, userId, eventId: id },
      update: { readAt: new Date() },
    });
    return { ok: true };
  }

  /**
   * Mark COD as paid for a delivered courier order (settlement shortcut).
   */
  async settleCod(
    organizationId: string,
    orderId: string,
    actor: ActorLabel,
  ): Promise<{ ok: true }> {
    const order = await this.prisma.order.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        amount: true,
        courierConsignmentId: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.courierConsignmentId) {
      throw new BadRequestException('Order has no courier booking');
    }
    if (!DELIVERED_STATUSES.has(order.status)) {
      throw new BadRequestException('Settle COD only after the order is delivered');
    }

    await this.orders.update(
      organizationId,
      order.id,
      {
        paymentStatus: 'paid',
        paidAmount: order.amount,
      },
      actor,
    );

    this.notifications.notifySafe({
      organizationId,
      type: 'courier_update',
      title: `COD collected — ${order.orderNumber}`,
      body: `৳${order.amount} marked paid`,
      href: '/dashboard/courier',
      excludeUserId: actor.userId,
    });

    return { ok: true };
  }

  private readyWhere(organizationId: string) {
    return {
      organizationId,
      deletedAt: null,
      courierConsignmentId: null,
      status: { in: [...READY_STATUSES] },
      shippingAddress: { not: null },
      AND: [
        { shippingAddress: { not: '' } },
        // Prisma can't express length easily — filter in app for min length if needed.
      ],
    };
  }

  private async consignmentsToday(
    organizationId: string,
    provider: string,
    today: Date,
  ): Promise<number> {
    return this.prisma.order.count({
      where: {
        organizationId,
        deletedAt: null,
        courierProvider: provider,
        courierBookedAt: { gte: today },
      },
    });
  }

  private async successRate(organizationId: string, provider: string): Promise<number> {
    const [delivered, total] = await Promise.all([
      this.prisma.order.count({
        where: {
          organizationId,
          deletedAt: null,
          courierProvider: provider,
          courierConsignmentId: { not: null },
          status: { in: [...DELIVERED_STATUSES] },
        },
      }),
      this.prisma.order.count({
        where: {
          organizationId,
          deletedAt: null,
          courierProvider: provider,
          courierConsignmentId: { not: null },
        },
      }),
    ]);
    if (total === 0) return 0;
    return Math.round((delivered / total) * 1000) / 10;
  }

  private toInboxEvent(row: {
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
    courierProvider: string | null;
    courierConsignmentId: string | null;
    courierStatus: string | null;
    courierStatusSlug: string | null;
    courierBookedAt: Date | null;
    courierStatusSyncedAt: Date | null;
    paymentStatus: string;
  }): CourierInboxEvent {
    const provider = (row.courierProvider ?? 'pathao') as CourierProvider;
    const consignmentId = row.courierConsignmentId ?? '—';
    const type = this.mapEventType(row.status, row.courierStatusSlug, row.paymentStatus);
    const createdAt =
      (row.courierStatusSyncedAt ?? row.courierBookedAt ?? new Date()).toISOString();
    const message =
      row.courierStatus?.trim() ||
      (type === 'submitted'
        ? `Booked with ${provider}`
        : type === 'delivered'
          ? 'Parcel delivered'
          : type === 'failed'
            ? 'Courier failed / returned'
            : `Status: ${row.status}`);

    return {
      id: `${row.id}:${type}`,
      type,
      orderId: row.id,
      orderNumber: row.orderNumber,
      consignmentId,
      provider,
      customerName: row.customerName,
      message,
      createdAt,
      isRead: true,
    };
  }

  private mapEventType(
    status: string,
    slug: string | null | undefined,
    paymentStatus: string,
  ): CourierInboxEvent['type'] {
    const s = (slug ?? '').toLowerCase();
    if (DELIVERED_STATUSES.has(status) || s.includes('deliver')) {
      if (paymentStatus === 'paid') return 'cod_collected';
      return 'delivered';
    }
    if (FAILED_STATUSES.has(status) || s.includes('return') || s.includes('fail')) {
      return 'returned';
    }
    if (s.includes('pick')) return 'picked';
    if (status === 'in_courier' || s.includes('transit') || s.includes('in_courier')) {
      return 'in_transit';
    }
    return 'submitted';
  }
}
