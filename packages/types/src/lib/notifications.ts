import { z } from 'zod';

export const notificationTypeSchema = z.enum([
  'low_stock',
  'overdue_followup',
  'payment_due',
  'failed_login',
  'courier_update',
  'ticket',
  'system',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

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
