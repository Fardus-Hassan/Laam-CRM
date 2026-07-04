import type { AppNotification } from '@laam/types';

import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/data/mock-notifications';
import { apiRequest } from '@/lib/api/client';

export type NotificationsApi = {
  list: () => Promise<AppNotification[]>;
  unreadCount: () => Promise<number>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export function createHttpNotificationsApi(): NotificationsApi {
  return {
    list: () => apiRequest('/crm/notifications'),
    unreadCount: () => apiRequest('/crm/notifications/unread-count'),
    markRead: (id) => apiRequest(`/crm/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () => apiRequest('/crm/notifications/read-all', { method: 'POST' }),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const notificationsApi = useHttpApi
  ? createHttpNotificationsApi()
  : createMockNotificationsApi();
