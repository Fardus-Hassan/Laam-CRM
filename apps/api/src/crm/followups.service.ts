import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type {
  FollowupDetail,
  FollowupListQuery,
  FollowupListResponse,
  FollowupQueue,
  FollowupStatus,
  FollowupType,
  OrderSource,
  UpdateFollowupPayload,
} from '@laam/types';
import type { Followup, Prisma } from '@prisma/client';

import type { ActorLabel } from '../common/actor.util';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

type RecentProductJson = {
  orderedAt: string;
  productName: string;
  quantity?: number;
};

type ActivityJson = {
  id: string;
  label: string;
  description?: string;
  timestamp: string;
  actorName?: string;
};

const OVERDUE_SCAN_MS = 60 * 60 * 1000;
const OVERDUE_NOTIFY_COOLDOWN_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class FollowupsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FollowupsService.name);
  private scanTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.scanTimer = setInterval(() => {
      void this.scanAndNotifyOverdue();
    }, OVERDUE_SCAN_MS);
    if (typeof this.scanTimer.unref === 'function') this.scanTimer.unref();
    setTimeout(() => void this.scanAndNotifyOverdue(), 45_000).unref?.();
  }

  onModuleDestroy() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  /** Notify org roles with overdue_followup permission (deduped per 12h). */
  async scanAndNotifyOverdue(): Promise<void> {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const groups = await this.prisma.followup.groupBy({
        by: ['organizationId'],
        where: {
          skipped: false,
          scheduleDate: { lt: start },
          followupStatus: { notIn: ['done', 'converted'] },
        },
        _count: { _all: true },
      });

      for (const group of groups) {
        const count = group._count._all;
        if (count <= 0) continue;
        const recent = await this.notifications.wasRecentlyNotified({
          organizationId: group.organizationId,
          type: 'overdue_followup',
          withinMs: OVERDUE_NOTIFY_COOLDOWN_MS,
        });
        if (recent) continue;
        this.notifications.notifySafe({
          organizationId: group.organizationId,
          type: 'overdue_followup',
          title:
            count === 1
              ? '1 overdue follow-up'
              : `${count} overdue follow-ups`,
          body: 'Customers are waiting for callback.',
          href: '/dashboard/followups',
        });
      }
    } catch (err) {
      this.logger.warn(
        `overdue follow-up scan failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  /** Open follow-ups scheduled for today (sidebar badge). */
  async todayDueCount(organizationId: string): Promise<number> {
    const today = this.todayDate();
    return this.prisma.followup.count({
      where: {
        organizationId,
        skipped: false,
        scheduleDate: today,
        followupStatus: { notIn: ['done', 'converted'] },
      },
    });
  }

  async createFromOrder(
    organizationId: string,
    input: {
      orderId: string;
      orderNumber: string;
      customerName: string;
      phone: string;
      address?: string | null;
      district?: string | null;
      area?: string | null;
      source: string;
      assignedAgentName?: string | null;
      customerNotes?: string | null;
      lineItems?: Array<{ productName: string; quantity: number }>;
      skipFollowup?: boolean;
      /** Override default queue (1–3). */
      queue?: number;
      /** Days from today for scheduleDate (0 = today). */
      delayDays?: number;
      /** Optional note stored on the follow-up. */
      followupNotes?: string | null;
      /** Real Customer.id when available (preferred over phone-* legacy keys). */
      customerId?: string | null;
      customerNumber?: string | null;
    },
    actor?: ActorLabel,
  ): Promise<FollowupDetail | null> {
    if (input.skipFollowup) {
      return null;
    }

    const existing = await this.prisma.followup.findFirst({
      where: { organizationId, orderId: input.orderId },
    });
    if (existing) {
      return this.toDetail(existing);
    }

    const priorOrders = await this.prisma.order.count({
      where: {
        organizationId,
        customerPhone: input.phone.trim(),
        NOT: { id: input.orderId },
      },
    });
    const type: FollowupType = priorOrders > 0 ? 'repeat' : 'listed';

    const schedule = new Date();
    schedule.setHours(0, 0, 0, 0);
    const delayDays = Math.max(0, Math.min(90, Math.floor(input.delayDays ?? 0)));
    if (delayDays > 0) {
      schedule.setDate(schedule.getDate() + delayDays);
    }

    const queue = Math.min(3, Math.max(1, Math.floor(input.queue ?? 1)));

    const now = new Date();
    const recentProducts: RecentProductJson[] = (input.lineItems ?? []).map((l) => ({
      orderedAt: now.toISOString(),
      productName: l.productName,
      quantity: l.quantity,
    }));

    const activities: ActivityJson[] = [
      {
        id: `act-${input.orderId}-created`,
        label: 'Follow-up created from order',
        description: input.orderNumber,
        timestamp: now.toISOString(),
        actorName: actor?.name ?? input.assignedAgentName ?? undefined,
      },
    ];
    if (input.followupNotes?.trim()) {
      activities.push({
        id: `act-${input.orderId}-note`,
        label: 'Automation note',
        description: input.followupNotes.trim(),
        timestamp: now.toISOString(),
        actorName: actor?.name ?? 'Automation',
      });
    }

    const phoneDigits = input.phone.replace(/\D/g, '') || input.phone;
    const customerId = input.customerId?.trim() || `phone-${phoneDigits}`;
    const customerNumber =
      input.customerNumber?.trim() || input.orderNumber;

    const row = await this.prisma.followup.create({
      data: {
        organizationId,
        queue,
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        customerId,
        customerNumber,
        scheduleDate: schedule,
        skipped: false,
        name: input.customerName.trim(),
        phone: input.phone.trim(),
        address: input.address?.trim() || null,
        area: input.area?.trim() || null,
        district: input.district?.trim() || null,
        customerNotes: input.customerNotes?.trim() || null,
        followupNotes: input.followupNotes?.trim() || null,
        followupStatus: 'no_status',
        type,
        recentProducts: recentProducts as unknown as Prisma.InputJsonValue,
        tags: [],
        smsStatus: 'not_sent',
        assignedAgentName: input.assignedAgentName?.trim() || actor?.name || null,
        source: input.source,
        activities: activities as unknown as Prisma.InputJsonValue,
      },
    });

    if (input.customerId) {
      await this.prisma.customer.updateMany({
        where: { id: input.customerId, organizationId },
        data: { hasFollowUp: true, followUpDue: schedule },
      });
    }

    return this.toDetail(row);
  }

  /**
   * Create a standalone follow-up from the Customers workspace.
   */
  async createForCustomer(
    organizationId: string,
    input: {
      customerId: string;
      scheduleDate?: string;
      note?: string;
      assignedAgentName?: string;
      queue?: FollowupQueue;
    },
    actor?: ActorLabel,
  ): Promise<FollowupDetail> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: input.customerId, organizationId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const schedule = input.scheduleDate
      ? new Date(input.scheduleDate)
      : new Date();
    schedule.setHours(0, 0, 0, 0);

    const now = new Date();
    const activities: ActivityJson[] = [
      {
        id: `act-cust-${customer.id}-${Date.now()}`,
        label: 'Follow-up created from customer',
        description: input.note?.trim() || undefined,
        timestamp: now.toISOString(),
        actorName: actor?.name ?? input.assignedAgentName ?? undefined,
      },
    ];

    const row = await this.prisma.followup.create({
      data: {
        organizationId,
        queue: input.queue ?? 1,
        orderId: null,
        orderNumber: null,
        customerId: customer.id,
        customerNumber: customer.customerNumber,
        scheduleDate: schedule,
        skipped: false,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        area: customer.area,
        district: customer.district,
        customerNotes: customer.notes,
        followupNotes: input.note?.trim() || null,
        followupStatus: 'no_status',
        type: customer.orderCount >= 2 ? 'repeat' : 'listed',
        recentProducts: [],
        tags: [],
        smsStatus: 'not_sent',
        assignedAgentName:
          input.assignedAgentName?.trim() ||
          customer.assignedAgentName ||
          actor?.name ||
          null,
        source: 'call',
        activities: activities as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { hasFollowUp: true, followUpDue: schedule },
    });

    return this.toDetail(row);
  }

  async list(
    organizationId: string,
    query: FollowupListQuery,
  ): Promise<FollowupListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, query.pageSize ?? 20));
    const queue = (query.queue ?? 1) as FollowupQueue;

    const where: Prisma.FollowupWhereInput = {
      organizationId,
      queue,
      skipped: false,
    };

    const today = this.todayDate();
    if (query.filter === 'today') {
      where.scheduleDate = today;
    } else if (query.filter === 'no_status') {
      where.followupStatus = 'no_status';
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { orderNumber: { contains: q, mode: 'insensitive' } },
            { customerNumber: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const baseQueueWhere: Prisma.FollowupWhereInput = {
      organizationId,
      queue,
      skipped: false,
    };

    const [total, rows, todayCount, noStatusCount, q1, q2, q3] = await Promise.all([
      this.prisma.followup.count({ where }),
      this.prisma.followup.findMany({
        where,
        orderBy: [{ scheduleDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.followup.count({
        where: { ...baseQueueWhere, scheduleDate: today },
      }),
      this.prisma.followup.count({
        where: { ...baseQueueWhere, followupStatus: 'no_status' },
      }),
      this.prisma.followup.count({
        where: { organizationId, queue: 1, skipped: false },
      }),
      this.prisma.followup.count({
        where: { organizationId, queue: 2, skipped: false },
      }),
      this.prisma.followup.count({
        where: { organizationId, queue: 3, skipped: false },
      }),
    ]);

    return {
      items: rows.map((r) => this.toListItem(r)),
      total,
      page,
      pageSize,
      summary: {
        count: total,
        todayCount,
        noStatusCount,
        queueCount: queue === 1 ? q1 : queue === 2 ? q2 : q3,
        queueCounts: { 1: q1, 2: q2, 3: q3 },
      },
      filters: [
        {
          id: 'all',
          label: 'All',
          count: queue === 1 ? q1 : queue === 2 ? q2 : q3,
        },
        { id: 'today', label: "Today's follow-up", count: todayCount },
        { id: 'no_status', label: 'No status', count: noStatusCount },
      ],
    };
  }

  async getById(organizationId: string, id: string): Promise<FollowupDetail> {
    const row = await this.prisma.followup.findFirst({
      where: { organizationId, id },
    });
    if (!row) throw new NotFoundException('Follow-up not found');
    return this.toDetail(row);
  }

  async update(
    organizationId: string,
    id: string,
    patch: UpdateFollowupPayload,
    actor?: ActorLabel,
  ): Promise<FollowupDetail> {
    const existing = await this.prisma.followup.findFirst({
      where: { organizationId, id },
    });
    if (!existing) throw new NotFoundException('Follow-up not found');

    const activities = this.parseActivities(existing.activities);
    const now = new Date();
    if (patch.followupStatus && patch.followupStatus !== existing.followupStatus) {
      activities.push({
        id: `act-${id}-status-${Date.now()}`,
        label: `Status → ${patch.followupStatus}`,
        timestamp: now.toISOString(),
        actorName: actor?.name,
      });
    }
    if (patch.followupNotes !== undefined) {
      activities.push({
        id: `act-${id}-note-${Date.now()}`,
        label: 'Follow-up note updated',
        description: patch.followupNotes,
        timestamp: now.toISOString(),
        actorName: actor?.name,
      });
    }

    const row = await this.prisma.followup.update({
      where: { id: existing.id },
      data: {
        scheduleDate:
          patch.scheduleDate !== undefined
            ? patch.scheduleDate
              ? new Date(patch.scheduleDate)
              : null
            : undefined,
        followupStatus: patch.followupStatus,
        followupNotes:
          patch.followupNotes !== undefined
            ? patch.followupNotes.trim() || null
            : undefined,
        customerNotes:
          patch.customerNotes !== undefined
            ? patch.customerNotes.trim() || null
            : undefined,
        tags: patch.tags,
        skipped: patch.skipped,
        assignedAgentName:
          patch.assignedAgentName !== undefined
            ? patch.assignedAgentName.trim() || null
            : undefined,
        activities: activities as unknown as Prisma.InputJsonValue,
      },
    });

    // Keep Customer follow-up flags in sync when status/schedule changes
    if (
      !existing.customerId.startsWith('phone-') &&
      (patch.followupStatus !== undefined ||
        patch.scheduleDate !== undefined ||
        patch.skipped !== undefined)
    ) {
      const open = await this.prisma.followup.count({
        where: {
          organizationId,
          customerId: existing.customerId,
          skipped: false,
          followupStatus: { notIn: ['done', 'converted'] },
        },
      });
      const nextDue = await this.prisma.followup.findFirst({
        where: {
          organizationId,
          customerId: existing.customerId,
          skipped: false,
          followupStatus: { notIn: ['done', 'converted'] },
          scheduleDate: { not: null },
        },
        orderBy: { scheduleDate: 'asc' },
        select: { scheduleDate: true },
      });
      await this.prisma.customer.updateMany({
        where: { id: existing.customerId, organizationId },
        data: {
          hasFollowUp: open > 0,
          followUpDue: nextDue?.scheduleDate ?? null,
        },
      });
    }

    return this.toDetail(row);
  }

  async bulkAction(
    organizationId: string,
    payload: {
      followupIds: string[];
      scheduleDate?: string;
      followupStatus?: FollowupStatus;
      assignedAgentName?: string;
      tags?: string[];
      note?: string;
    },
    actor?: ActorLabel,
  ): Promise<{ successCount: number; failedCount: number; message: string }> {
    let successCount = 0;
    for (const id of payload.followupIds) {
      try {
        const existing = await this.prisma.followup.findFirst({
          where: { organizationId, id },
        });
        if (!existing) continue;
        const followupNotes = payload.note
          ? existing.followupNotes
            ? `${existing.followupNotes}\n${payload.note}`
            : payload.note
          : undefined;
        await this.update(
          organizationId,
          id,
          {
            scheduleDate: payload.scheduleDate,
            followupStatus: payload.followupStatus,
            assignedAgentName: payload.assignedAgentName,
            tags: payload.tags,
            followupNotes,
          },
          actor,
        );
        successCount += 1;
      } catch {
        // count failed
      }
    }
    return {
      successCount,
      failedCount: payload.followupIds.length - successCount,
      message: `Updated ${successCount} follow-up(s)`,
    };
  }

  private todayDate(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private parseRecentProducts(value: unknown): RecentProductJson[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((raw) => {
      const item = raw as RecentProductJson;
      if (!item?.productName || !item?.orderedAt) return [];
      return [
        {
          orderedAt: item.orderedAt,
          productName: String(item.productName),
          quantity: item.quantity ? Number(item.quantity) : undefined,
        },
      ];
    });
  }

  private parseActivities(value: unknown): ActivityJson[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((raw, i) => {
      const item = raw as ActivityJson;
      if (!item?.label || !item?.timestamp) return [];
      return [
        {
          id: item.id || `act-${i}`,
          label: item.label,
          description: item.description,
          timestamp: item.timestamp,
          actorName: item.actorName,
        },
      ];
    });
  }

  private formatScheduleDate(value: Date | null): string | undefined {
    if (!value) return undefined;
    return value.toISOString().slice(0, 10);
  }

  private toListItem(row: Followup): FollowupDetail {
    return this.toDetail(row);
  }

  private toDetail(row: Followup): FollowupDetail {
    const recentProducts = this.parseRecentProducts(row.recentProducts);
    const activities = this.parseActivities(row.activities);
    const status = (
      ['no_status', 'pending', 'done', 'converted'].includes(row.followupStatus)
        ? row.followupStatus
        : 'no_status'
    ) as FollowupStatus;
    const type = (
      ['listed', 'repeat', 'vip'].includes(row.type) ? row.type : 'listed'
    ) as FollowupType;

    return {
      id: row.id,
      queue: ([1, 2, 3].includes(row.queue) ? row.queue : 1) as FollowupQueue,
      customerId: row.customerId,
      customerNumber: row.customerNumber,
      orderId: row.orderId ?? undefined,
      orderNumber: row.orderNumber ?? undefined,
      scheduleDate: this.formatScheduleDate(row.scheduleDate),
      skipped: row.skipped,
      name: row.name,
      phone: row.phone,
      address: row.address ?? undefined,
      area: row.area ?? undefined,
      district: row.district ?? undefined,
      followupNotes: row.followupNotes ?? undefined,
      customerNotes: row.customerNotes ?? undefined,
      hasFollowupNotes: Boolean(row.followupNotes?.trim()),
      hasCustomerNotes: Boolean(row.customerNotes?.trim()),
      followupStatus: status,
      type,
      recentProducts,
      tags: row.tags ?? [],
      smsStatus: row.smsStatus === 'sent' ? 'sent' : 'not_sent',
      assignedAgentName: row.assignedAgentName ?? undefined,
      source: row.source as OrderSource,
      createdAt: row.createdAt.toISOString(),
      activities,
    };
  }
}
