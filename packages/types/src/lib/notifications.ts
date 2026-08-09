import { z } from 'zod';

import type { Permission } from './permission-catalog.js';

export const notificationTypeSchema = z.enum([
  'failed_login',
  'system',
  'low_stock',
  'overdue_followup',
  'courier_update',
  'ticket',
  'payment_due',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const NOTIFICATION_TYPES: NotificationType[] = [
  'failed_login',
  'system',
  'low_stock',
  'overdue_followup',
  'courier_update',
  'ticket',
  'payment_due',
];

export const appNotificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string(),
  href: z.string().optional(),
  createdAt: z.string(),
  isRead: z.boolean(),
});
export type AppNotification = z.infer<typeof appNotificationSchema>;

export const notificationListPageSchema = z.object({
  items: z.array(appNotificationSchema),
  nextCursor: z.string().nullable(),
});
export type NotificationListPage = z.infer<typeof notificationListPageSchema>;

/** Maps notification type → RBAC permission used for role-based delivery. */
export const NOTIFICATION_TYPE_PERMISSION: Record<NotificationType, Permission> = {
  failed_login: 'notifications.failed_login',
  system: 'notifications.system',
  low_stock: 'notifications.low_stock',
  overdue_followup: 'notifications.overdue_followup',
  courier_update: 'notifications.courier_update',
  ticket: 'notifications.ticket',
  payment_due: 'notifications.payment_due',
};

export function permissionForNotificationType(type: NotificationType): Permission {
  return NOTIFICATION_TYPE_PERMISSION[type];
}

export function notificationTypesForPermissions(
  permissions: readonly string[],
): NotificationType[] {
  const set = new Set(permissions);
  return NOTIFICATION_TYPES.filter((type) => set.has(NOTIFICATION_TYPE_PERMISSION[type]));
}
