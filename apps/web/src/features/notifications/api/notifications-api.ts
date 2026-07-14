import type { AppNotification } from '@laam/types';

import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/data/mock-notifications';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

export type NotificationsApi = {
  list: () => Promise<AppNotification[]>;
  unreadCount: () => Promise<number>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUnavailable(error: unknown) {
  return error instanceof ApiError && (error.status === 404 || error.status === 501);
}

export function createMockNotificationsApi(): NotificationsApi {
  return {
    async list() {
      await delay(50);
      return listNotifications();
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
  };
}

/** Soft stub until CRM notifications routes ship — never throw on missing endpoints. */
export function createHttpNotificationsApi(): NotificationsApi {
  return {
    async list() {
      try {
        return await apiRequest<AppNotification[]>('/crm/notifications');
      } catch (error) {
        if (isUnavailable(error)) {
          return [];
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
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const notificationsApi = useHttpApi
  ? createHttpNotificationsApi()
  : createMockNotificationsApi();
