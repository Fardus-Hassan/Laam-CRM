import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CarrybeeCourierService } from './carrybee-courier.service';
import { CourierIntegrationsService } from './courier-integrations.service';
import type { OrdersService } from './orders.service';
import { NotificationsService } from './notifications.service';

const TICK_MS = 180_000;
const BATCH_SIZE = 40;
const CONCURRENCY = 4;
const TERMINAL_CRM = new Set(['delivered', 'completed', 'cancelled', 'returned']);

@Injectable()
export class CarrybeeSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CarrybeeSyncService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly lastOrgRun = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: CourierIntegrationsService,
    private readonly carrybee: CarrybeeCourierService,
    @Inject(forwardRef(() => require('./orders.service').OrdersService))
    private readonly orders: OrdersService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, TICK_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
    // First pass shortly after boot
    setTimeout(() => void this.tick(), 20_000).unref?.();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const orgs = await this.integrations.listEnabledCarrybeeOrgs();
      const now = Date.now();
      for (const org of orgs) {
        const intervalMs = Math.max(60, org.syncIntervalSec || 180) * 1000;
        const last = this.lastOrgRun.get(org.organizationId) ?? 0;
        if (now - last < intervalMs) continue;
        this.lastOrgRun.set(org.organizationId, now);
        try {
          await this.syncOrganization(org.organizationId);
          await this.integrations.markCarrybeeSyncResult(org.organizationId, { ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Carrybee sync failed for ${org.organizationId}: ${message}`);
          await this.integrations.markCarrybeeSyncResult(org.organizationId, {
            ok: false,
            error: message,
          });
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Sync one order (manual refresh / after book). */
  async syncOrder(
    organizationId: string,
    orderIdOrNumber: string,
  ): Promise<{ updated: boolean }> {
    const order = await this.prisma.order.findFirst({
      where: {
        organizationId,
        OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
      },
    });
    if (!order?.courierConsignmentId || order.courierProvider !== 'carrybee') {
      return { updated: false };
    }
    return this.syncOne(organizationId, order);
  }

  async syncOrganization(organizationId: string): Promise<{ synced: number }> {
    const staleBefore = new Date(Date.now() - 90_000);
    const rows = await this.prisma.order.findMany({
      where: {
        organizationId,
        courierProvider: 'carrybee',
        courierConsignmentId: { not: null },
        status: { notIn: [...TERMINAL_CRM] },
        OR: [
          { courierStatusSyncedAt: null },
          { courierStatusSyncedAt: { lt: staleBefore } },
        ],
      },
      orderBy: { courierStatusSyncedAt: 'asc' },
      take: BATCH_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        courierConsignmentId: true,
        courierStatusSlug: true,
        courierStatus: true,
      },
    });

    let synced = 0;
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const chunk = rows.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map((row) => this.syncOne(organizationId, row)),
      );
      synced += results.filter((r) => r.updated).length;
    }
    return { synced };
  }

  private async syncOne(
    organizationId: string,
    order: {
      id: string;
      orderNumber: string;
      status: string;
      courierConsignmentId: string | null;
      courierStatusSlug: string | null;
      courierStatus: string | null;
    },
  ): Promise<{ updated: boolean }> {
    if (!order.courierConsignmentId) return { updated: false };

    let info: Awaited<ReturnType<CarrybeeCourierService['getOrderDetails']>>;
    try {
      info = await this.carrybee.getOrderDetails(
        organizationId,
        order.courierConsignmentId,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Carrybee sync skipped for ${order.orderNumber}: ${message}`,
      );
      await this.prisma.order.update({
        where: { id: order.id },
        data: { courierStatusSyncedAt: new Date() },
      });
      return { updated: false };
    }
    const raw = info.transferStatus;
    const mapped = await this.integrations.resolveStatusMapping(
      organizationId,
      'carrybee',
      raw,
    );

    const statusChanged =
      order.courierStatusSlug !== mapped.slug ||
      order.courierStatus !== mapped.label;

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        courierStatus: mapped.label,
        courierStatusSlug: mapped.slug,
        courierStatusSyncedAt: new Date(),
      },
    });

    if (
      mapped.crmStatus &&
      mapped.crmStatus !== order.status &&
      !TERMINAL_CRM.has(order.status)
    ) {
      try {
        await this.orders.updateStatus(
          organizationId,
          order.id,
          mapped.crmStatus as Parameters<OrdersService['updateStatus']>[2],
          { name: 'Carrybee sync' },
        );
      } catch (err) {
        this.logger.warn(
          `CRM status map skipped for ${order.orderNumber}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (statusChanged) {
      this.notifications.notifySafe({
        organizationId,
        type: 'courier_update',
        title: `${order.orderNumber}: ${mapped.label}`,
        body: `Carrybee status → ${mapped.label}`,
        href: `/dashboard/orders/${order.orderNumber}`,
      });
    }

    return { updated: statusChanged };
  }
}
