import type { AppNotification, NotificationListPage } from '@laam/types';

import {
  deleteNotification,
  deleteNotifications,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/data/mock-notifications';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

export type NotificationListQuery = {
  cursor?: string;
  limit?: number;
  search?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type NotificationsApi = {
  list: (options?: NotificationListQuery) => Promise<NotificationListPage>;
  unreadCount: () => Promise<number>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteOne: (id: string) => Promise<void>;
  deleteMany: (ids: string[]) => Promise<{ deleted: number }>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUnavailable(error: unknown) {
  return error instanceof ApiError && (error.status === 404 || error.status === 501);
}

function dayBounds(ymd: string): { start: number; end: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const start = Date.parse(`${ymd}T00:00:00.000Z`);
  const end = Date.parse(`${ymd}T23:59:59.999Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
}

function filterMockItems(all: AppNotification[], options?: NotificationListQuery) {
  let rows = all;
  const search = options?.search?.trim().toLowerCase();
  if (search) {
    rows = rows.filter(
      (item) =>
        item.title.toLowerCase().includes(search) ||
        item.body.toLowerCase().includes(search) ||
        item.type.toLowerCase().includes(search),
    );
  }

  if (options?.date) {
    const bounds = dayBounds(options.date);
    if (bounds) {
      rows = rows.filter((item) => {
        const t = Date.parse(item.createdAt);
        return t >= bounds.start && t <= bounds.end;
      });
    }
  } else {
    const from = options?.dateFrom ? dayBounds(options.dateFrom)?.start : undefined;
    const to = options?.dateTo ? dayBounds(options.dateTo)?.end : undefined;
    if (from !== undefined || to !== undefined) {
      rows = rows.filter((item) => {
        const t = Date.parse(item.createdAt);
        if (from !== undefined && t < from) return false;
        if (to !== undefined && t > to) return false;
        return true;
      });
    }
  }

  return rows;
}

export function createMockNotificationsApi(): NotificationsApi {
  return {
    async list(options) {
      await delay(50);
      const all = filterMockItems(listNotifications(), options);
      const limit = options?.limit ?? 20;
      const start = options?.cursor
        ? all.findIndex((item) => item.id === options.cursor) + 1
        : 0;
      const slice = all.slice(Math.max(0, start), Math.max(0, start) + limit);
      const next =
        start + limit < all.length ? slice[slice.length - 1]?.id ?? null : null;
      return { items: slice, nextCursor: next };
    },
    async unreadCount() {
      return getUnreadNotificationCount();
    },
    async markRead(id) {
      markNotificationRead(id);
    },
    async markAllRead() {
      markAllNotificationsRead();
    },
    async deleteOne(id) {
      deleteNotification(id);
    },
    async deleteMany(ids) {
      return { deleted: deleteNotifications(ids) };
    },
  };
}

export function createHttpNotificationsApi(): NotificationsApi {
  return {
    async list(options) {
      try {
        const params = new URLSearchParams();
        if (options?.cursor) params.set('cursor', options.cursor);
        if (options?.limit) params.set('limit', String(options.limit));
        if (options?.search?.trim()) params.set('search', options.search.trim());
        if (options?.date) params.set('date', options.date);
        if (options?.dateFrom) params.set('dateFrom', options.dateFrom);
        if (options?.dateTo) params.set('dateTo', options.dateTo);
        const qs = params.toString();
        return await apiRequest<NotificationListPage>(
          `/crm/notifications${qs ? `?${qs}` : ''}`,
        );
      } catch (error) {
        if (isUnavailable(error)) {
          return { items: [], nextCursor: null };
        }
        throw error;
      }
    },
    async unreadCount() {
      try {
        return await apiRequest<number>('/crm/notifications/unread-count');
      } catch (error) {
        if (isUnavailable(error)) {
          return 0;
        }
        throw error;
      }
    },
    async markRead(id) {
      try {
        await apiRequest(`/crm/notifications/${id}/read`, { method: 'POST' });
      } catch (error) {
        if (isUnavailable(error)) {
          return;
        }
        throw error;
      }
    },
    async markAllRead() {
      try {
        await apiRequest('/crm/notifications/read-all', { method: 'POST' });
      } catch (error) {
        if (isUnavailable(error)) {
          return;
        }
        throw error;
      }
    },
    async deleteOne(id) {
      try {
        await apiRequest(`/crm/notifications/${id}`, { method: 'DELETE' });
      } catch (error) {
        if (isUnavailable(error)) {
          return;
        }
        throw error;
      }
    },
    async deleteMany(ids) {
      try {
        return await apiRequest<{ deleted: number }>('/crm/notifications/bulk-delete', {
          method: 'POST',
          body: JSON.stringify({ ids }),
        });
      } catch (error) {
        if (isUnavailable(error)) {
          return { deleted: 0 };
        }
        throw error;
      }
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const notificationsApi = useHttpApi
  ? createHttpNotificationsApi()
  : createMockNotificationsApi();

export type { AppNotification };
