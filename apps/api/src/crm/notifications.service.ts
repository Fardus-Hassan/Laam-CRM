import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { AppNotification, NotificationType, Permission } from '@laam/types';

import { PermissionResolverService } from '../common/permission-resolver.service';
import { PrismaService } from '../prisma/prisma.service';

const TYPE_PERMISSION: Record<NotificationType, Permission> = {
  failed_login: 'notifications.failed_login',
  system: 'notifications.system',
  low_stock: 'notifications.low_stock',
  overdue_followup: 'notifications.overdue_followup',
  courier_update: 'notifications.courier_update',
  ticket: 'notifications.ticket',
  payment_due: 'notifications.payment_due',
};

const ALL_TYPES = Object.keys(TYPE_PERMISSION) as NotificationType[];
const RETENTION_DAYS = 30;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

export type CreateNotificationInput = {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
};

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private purgeTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionResolverService,
  ) {}

  onModuleInit() {
    void this.purgeOlderThanRetention();
    this.purgeTimer = setInterval(() => {
      void this.purgeOlderThanRetention();
    }, PURGE_INTERVAL_MS);
    if (typeof this.purgeTimer.unref === 'function') {
      this.purgeTimer.unref();
    }
  }

  onModuleDestroy() {
    if (this.purgeTimer) {
      clearInterval(this.purgeTimer);
      this.purgeTimer = null;
    }
  }

  async purgeOlderThanRetention() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`Purged ${result.count} notifications older than ${RETENTION_DAYS} days`);
    }
  }

  private typesForPermissions(permissions: readonly Permission[]): NotificationType[] {
    const set = new Set(permissions);
    return ALL_TYPES.filter((type) => set.has(TYPE_PERMISSION[type]));
  }

  private toDto(row: {
    id: string;
    type: string;
    title: string;
    body: string;
    href: string | null;
    createdAt: Date;
    isRead: boolean;
  }): AppNotification {
    return {
      id: row.id,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      href: row.href ?? undefined,
      createdAt: row.createdAt.toISOString(),
      isRead: row.isRead,
    };
  }

  async listForUser(
    userId: string,
    options?: {
      cursor?: string;
      limit?: number;
      search?: string;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<{ items: AppNotification[]; nextCursor: string | null }> {
    const permissions = await this.permissions.resolveForUserId(userId);
    if (!permissions.includes('notifications.view')) {
      throw new ForbiddenException('Missing permission: notifications.view');
    }
    const types = this.typesForPermissions(permissions);
    if (types.length === 0) {
      return { items: [], nextCursor: null };
    }

    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
    const createdAt = this.buildCreatedAtFilter(options);

    let cursorFilter: Record<string, unknown> | undefined;
    if (options?.cursor) {
      const cursorRow = await this.prisma.notification.findFirst({
        where: { id: options.cursor, userId },
        select: { id: true, createdAt: true },
      });
      if (cursorRow) {
        cursorFilter = {
          OR: [
            { createdAt: { lt: cursorRow.createdAt } },
            { createdAt: cursorRow.createdAt, id: { lt: cursorRow.id } },
          ],
        };
      }
    }

    const search = options?.search?.trim();
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        type: { in: types },
        ...(createdAt ? { createdAt } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { body: { contains: search, mode: 'insensitive' } },
                { type: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(cursorFilter ?? {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const page = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? page[page.length - 1]?.id ?? null : null;
    return {
      items: page.map((row) => this.toDto(row)),
      nextCursor,
    };
  }

  private buildCreatedAtFilter(options?: {
    date?: string;
    dateFrom?: string;
    dateTo?: string;
  }): { gte?: Date; lte?: Date } | undefined {
    const day = options?.date?.trim();
    if (day) {
      const bounds = this.dayBounds(day);
      return bounds ? { gte: bounds.start, lte: bounds.end } : undefined;
    }

    const from = options?.dateFrom?.trim();
    const to = options?.dateTo?.trim();
    const gte = from ? this.dayBounds(from)?.start : undefined;
    const lte = to ? this.dayBounds(to)?.end : undefined;
    if (!gte && !lte) {
      return undefined;
    }
    return {
      ...(gte ? { gte } : {}),
      ...(lte ? { lte } : {}),
    };
  }

  /** Parse YYYY-MM-DD as local calendar day bounds in UTC wall-clock of that date. */
  private dayBounds(ymd: string): { start: Date; end: Date } | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      return null;
    }
    const start = new Date(`${ymd}T00:00:00.000Z`);
    const end = new Date(`${ymd}T23:59:59.999Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    return { start, end };
  }

  async unreadCount(userId: string): Promise<number> {
    const permissions = await this.permissions.resolveForUserId(userId);
    if (!permissions.includes('notifications.view')) {
      return 0;
    }
    const types = this.typesForPermissions(permissions);
    if (types.length === 0) {
      return 0;
    }
    return this.prisma.notification.count({
      where: { userId, isRead: false, type: { in: types } },
    });
  }

  async markRead(userId: string, id: string): Promise<void> {
    const permissions = await this.permissions.resolveForUserId(userId);
    if (!permissions.includes('notifications.view')) {
      throw new ForbiddenException('Missing permission: notifications.view');
    }
    const types = this.typesForPermissions(permissions);
    const row = await this.prisma.notification.findFirst({
      where: { id, userId, type: { in: types } },
    });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    if (!row.isRead) {
      await this.prisma.notification.update({
        where: { id: row.id },
        data: { isRead: true },
      });
    }
  }

  async markAllRead(userId: string): Promise<void> {
    const permissions = await this.permissions.resolveForUserId(userId);
    if (!permissions.includes('notifications.view')) {
      throw new ForbiddenException('Missing permission: notifications.view');
    }
    const types = this.typesForPermissions(permissions);
    if (types.length === 0) {
      return;
    }
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false, type: { in: types } },
      data: { isRead: true },
    });
  }

  async deleteOne(userId: string, id: string): Promise<void> {
    const permissions = await this.permissions.resolveForUserId(userId);
    if (!permissions.includes('notifications.view')) {
      throw new ForbiddenException('Missing permission: notifications.view');
    }
    const types = this.typesForPermissions(permissions);
    const row = await this.prisma.notification.findFirst({
      where: { id, userId, type: { in: types } },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    await this.prisma.notification.delete({ where: { id: row.id } });
  }

  async deleteMany(userId: string, ids: string[]): Promise<{ deleted: number }> {
    const permissions = await this.permissions.resolveForUserId(userId);
    if (!permissions.includes('notifications.view')) {
      throw new ForbiddenException('Missing permission: notifications.view');
    }
    const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { deleted: 0 };
    }
    const types = this.typesForPermissions(permissions);
    if (types.length === 0) {
      return { deleted: 0 };
    }
    const result = await this.prisma.notification.deleteMany({
      where: { userId, id: { in: uniqueIds }, type: { in: types } },
    });
    return { deleted: result.count };
  }

  async create(input: CreateNotificationInput): Promise<AppNotification> {
    const row = await this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
      },
    });
    return this.toDto(row);
  }

  /**
   * Create one notification per org user that holds the type's permission
   * (and notifications.view).
   */
  async notifyUsersWithPermission(input: {
    organizationId: string;
    type: NotificationType;
    title: string;
    body: string;
    href?: string;
    excludeUserId?: string;
  }): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: input.organizationId,
        status: { in: ['active', 'invited'] },
        ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {}),
      },
      include: { customRole: true },
    });

    let created = 0;
    for (const user of users) {
      const permissions = await this.permissions.resolveFromUserRow(user);
      if (
        !permissions.includes('notifications.view') ||
        !permissions.includes(TYPE_PERMISSION[input.type])
      ) {
        continue;
      }
      await this.create({
        organizationId: input.organizationId,
        userId: user.id,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
      });
      created += 1;
    }
    return created;
  }
}
