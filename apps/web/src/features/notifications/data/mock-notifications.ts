import type { AppNotification } from '@laam/types';

let notifications: AppNotification[] = [
  { id: 'n1', type: 'low_stock', title: 'Low stock: Modhu 500g', body: 'Only 8 units left — reorder soon.', href: '/dashboard/inventory/products', createdAt: '2026-07-04T09:00:00Z', isRead: false },
  { id: 'n2', type: 'overdue_followup', title: '3 overdue follow-ups', body: 'Customers waiting for callback today.', href: '/dashboard/followups', createdAt: '2026-07-04T08:30:00Z', isRead: false },
  { id: 'n3', type: 'courier_update', title: 'COD collected — MH-8819', body: '৳2,450 collected via Steadfast.', href: '/dashboard/courier', createdAt: '2026-07-04T08:55:00Z', isRead: false },
  { id: 'n4', type: 'ticket', title: 'Urgent ticket: Refund request', body: 'Damaged packaging — Rashid Ahmed.', href: '/dashboard/support', createdAt: '2026-07-04T07:05:00Z', isRead: true },
  { id: 'n5', type: 'payment_due', title: 'Invoice pending', body: 'LAAM-2026-07 is due Jul 5.', href: '/dashboard/billing', createdAt: '2026-07-03T12:00:00Z', isRead: true },
  { id: 'n6', type: 'failed_login', title: 'Failed login attempt', body: 'Unknown IP 45.248.60.12 tried to sign in.', href: '/dashboard/reports?view=login-history', createdAt: '2026-07-01T22:15:00Z', isRead: true },
];

export function listNotifications(): AppNotification[] {
  return [...notifications];
}

export function getUnreadNotificationCount(): number {
  return notifications.filter((n) => !n.isRead).length;
}

export function markNotificationRead(id: string): void {
  notifications = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
}

export function markAllNotificationsRead(): void {
  notifications = notifications.map((n) => ({ ...n, isRead: true }));
}
