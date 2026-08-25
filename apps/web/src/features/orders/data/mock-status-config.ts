import type {
  BulkActionId,
  OrderQueuePage,
  OrderStatusConfig,
} from '@laam/types';

import { getOrderQueuePages, getOrderStatuses } from '@/features/orders/data/order-status-store';
import {
  statusShowsInNestedTabs,
  statusShowsInSidebar,
} from '@/features/orders/lib/order-status-visibility';

const DEFAULT_BULK: BulkActionId[] = [
  'status_change',
  'print_selected',
  'print_barcode',
  'print_info',
  'export',
  'send_sms',
  'set_followup',
  'transfer',
  'submit_pathao',
  'submit_carrybee',
  'courier_cancel',
  'courier_unlink',
];

const PENDING_BULK: BulkActionId[] = [
  ...DEFAULT_BULK,
  'update_courier_status',
];

const CONFIRMED_BULK: BulkActionId[] = [
  ...PENDING_BULK,
];

function status(
  partial: Partial<Omit<OrderStatusConfig, 'id' | 'slug'>> &
    Pick<OrderStatusConfig, 'slug' | 'label' | 'color' | 'group' | 'displayMode'>,
): OrderStatusConfig {
  return {
    ...partial,
    id: `status-${partial.slug}`,
    isTerminal: partial.isTerminal ?? false,
    isDefault: partial.isDefault ?? false,
    allowedTransitions: partial.allowedTransitions ?? [],
    bulkActions: partial.bulkActions ?? [],
    showInGroupByStatus: partial.showInGroupByStatus ?? true,
  };
}

/** Mirrors API DEFAULT_ORG_ORDER_STATUSES (COO PDF + core workflow). */
export const MOCK_ORDER_STATUSES: OrderStatusConfig[] = [
  status({
    slug: 'pending',
    label: 'Pending',
    color: 'hsl(174 58% 42%)',
    group: 'intake',
    parentSlug: 'pendings',
    displayMode: 'sidebar_and_tab',
    isDefault: true,
    sidebarOrder: 10,
    allowedTransitions: ['confirmed', 'hold', 'cancelled', 'variation_1'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'confirmed',
    label: 'Confirmed',
    color: 'hsl(200 60% 45%)',
    group: 'confirm',
    displayMode: 'sidebar',
    sidebarOrder: 20,
    allowedTransitions: ['processing', 'in_courier', 'hold', 'cancelled'],
    bulkActions: CONFIRMED_BULK,
  }),
  status({
    slug: 'processing',
    label: 'Processing',
    color: 'hsl(260 45% 55%)',
    group: 'fulfillment',
    displayMode: 'sidebar',
    sidebarOrder: 40,
    allowedTransitions: ['in_courier', 'hold', 'variation_1'],
    bulkActions: DEFAULT_BULK,
  }),
  status({
    slug: 'incomplete',
    label: 'Incomplete Orders',
    color: 'hsl(25 70% 48%)',
    group: 'intake',
    displayMode: 'sidebar',
    sidebarOrder: 41,
    allowedTransitions: ['pending', 'processing', 'hold', 'cancelled'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'good_but_no_response',
    label: 'Good But No Response',
    color: 'hsl(190 45% 45%)',
    group: 'intake',
    displayMode: 'sidebar',
    sidebarOrder: 42,
    allowedTransitions: ['pending', 'confirmed', 'hold', 'cancelled'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'no_response',
    label: 'No Response',
    color: 'hsl(210 25% 50%)',
    group: 'intake',
    displayMode: 'sidebar',
    sidebarOrder: 43,
    allowedTransitions: ['pending', 'hold', 'cancelled'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'advanced_payment',
    label: 'Advanced Payment',
    color: 'hsl(160 50% 40%)',
    group: 'intake',
    displayMode: 'sidebar',
    sidebarOrder: 44,
    allowedTransitions: ['confirmed', 'processing', 'hold', 'cancelled'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'hold',
    label: 'On Hold',
    color: 'hsl(38 90% 50%)',
    group: 'confirm',
    displayMode: 'sidebar',
    sidebarOrder: 45,
    allowedTransitions: ['pending', 'confirmed', 'hold_followup', 'cancelled'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'hold_followup',
    label: 'Hold Followup',
    color: 'hsl(38 85% 42%)',
    group: 'confirm',
    displayMode: 'sidebar',
    sidebarOrder: 46,
    allowedTransitions: ['pending', 'confirmed', 'hold', 'cancelled'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'pre_order',
    label: 'Pre Order',
    color: 'hsl(280 40% 50%)',
    group: 'intake',
    displayMode: 'sidebar',
    sidebarOrder: 47,
    allowedTransitions: ['pending', 'confirmed', 'processing', 'cancelled'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'cancelled',
    label: 'Cancelled',
    color: 'hsl(0 60% 50%)',
    group: 'terminal',
    displayMode: 'sidebar',
    sidebarOrder: 48,
    isTerminal: true,
    allowedTransitions: [],
    bulkActions: ['export'],
  }),
  status({
    slug: 'variation_1',
    label: 'Variation 1',
    color: 'hsl(200 55% 48%)',
    group: 'special',
    displayMode: 'sidebar',
    sidebarOrder: 50,
    allowedTransitions: ['processing', 'in_courier', 'hold', 'cancelled', 'variation_2'],
    bulkActions: CONFIRMED_BULK,
  }),
  status({
    slug: 'variation_2',
    label: 'Variation 2',
    color: 'hsl(200 50% 42%)',
    group: 'special',
    displayMode: 'sidebar',
    sidebarOrder: 51,
    allowedTransitions: ['processing', 'in_courier', 'hold', 'cancelled', 'variation_3'],
    bulkActions: CONFIRMED_BULK,
  }),
  status({
    slug: 'variation_3',
    label: 'Variation 3',
    color: 'hsl(200 45% 38%)',
    group: 'special',
    displayMode: 'sidebar',
    sidebarOrder: 52,
    allowedTransitions: ['processing', 'in_courier', 'hold', 'cancelled'],
    bulkActions: CONFIRMED_BULK,
  }),
  status({
    slug: 'rts_pathao',
    label: 'RTS to Pathao',
    color: 'hsl(330 55% 48%)',
    group: 'returns',
    displayMode: 'sidebar',
    sidebarOrder: 60,
    allowedTransitions: ['in_courier', 'returned', 'pending_return'],
    bulkActions: [...DEFAULT_BULK, 'update_courier_status'],
  }),
  status({
    slug: 'rts_carrybee',
    label: 'RTS to CarryBee',
    color: 'hsl(330 50% 44%)',
    group: 'returns',
    displayMode: 'sidebar',
    sidebarOrder: 61,
    allowedTransitions: ['in_courier', 'returned', 'pending_return'],
    bulkActions: [...DEFAULT_BULK, 'update_courier_status'],
  }),
  status({
    slug: 'in_courier',
    label: 'In Courier',
    color: 'hsl(220 55% 50%)',
    group: 'fulfillment',
    displayMode: 'sidebar',
    sidebarOrder: 62,
    allowedTransitions: ['delivered', 'partial_delivered', 'pending_return', 'cancelled'],
    bulkActions: [...DEFAULT_BULK, 'update_courier_status'],
  }),
  status({
    slug: 'delivered',
    label: 'Delivered',
    color: 'hsl(142 50% 40%)',
    group: 'delivery',
    displayMode: 'sidebar',
    sidebarOrder: 63,
    allowedTransitions: ['completed', 'pending_return'],
    bulkActions: ['export', 'print_info'],
  }),
  status({
    slug: 'partial_delivered',
    label: 'Partial Delivered',
    color: 'hsl(142 40% 45%)',
    group: 'delivery',
    displayMode: 'sidebar',
    sidebarOrder: 64,
    allowedTransitions: ['delivered', 'pending_return', 'completed'],
    bulkActions: ['export', 'print_info'],
  }),
  status({
    slug: 'pending_return',
    label: 'Pending Returned',
    color: 'hsl(15 70% 50%)',
    group: 'returns',
    displayMode: 'sidebar',
    sidebarOrder: 65,
    allowedTransitions: ['returned', 'completed'],
    bulkActions: DEFAULT_BULK,
  }),
  status({
    slug: 'returned',
    label: 'Returned',
    color: 'hsl(15 60% 45%)',
    group: 'returns',
    displayMode: 'sidebar',
    sidebarOrder: 66,
    isTerminal: true,
    allowedTransitions: [],
    bulkActions: ['export'],
  }),
  status({
    slug: 'completed',
    label: 'Completed',
    color: 'hsl(142 60% 35%)',
    group: 'terminal',
    displayMode: 'sidebar',
    sidebarOrder: 70,
    isTerminal: true,
    allowedTransitions: [],
    bulkActions: ['export', 'print_info'],
  }),
];

export const MOCK_ORDER_QUEUE_PAGES: OrderQueuePage[] = [
  {
    slug: 'create_new',
    label: 'Create New',
    href: '/dashboard/orders/new',
    kind: 'form',
    displayMode: 'sidebar',
    sidebarOrder: 0,
    title: 'Create New Order',
    description: 'Manually enter a customer order.',
    showInNav: true,
  },
  {
    slug: 'all',
    label: 'All Orders',
    href: '/dashboard/orders',
    kind: 'list',
    displayMode: 'sidebar',
    sidebarOrder: 1,
    title: 'All Orders',
    description: 'Full order list with filters, bulk actions, and sales summary.',
    showInNav: true,
  },
  {
    slug: 'pendings',
    label: 'Call confirm',
    href: '/dashboard/orders/queues/pendings',
    kind: 'list',
    displayMode: 'sidebar',
    sidebarOrder: 10,
    // Nested tabs come from statuses with parentSlug=pendings + nested-tab visibility
    // (see getQueueChildStatusSlugs) — not a hardcoded list.
    defaultChildSlug: 'pending',
    title: 'Call confirm',
    description: 'New orders waiting for confirmation before packing or courier booking.',
    showInNav: true,
  },
  {
    slug: 'followups',
    label: 'Followups',
    href: '/dashboard/orders/queues/followups',
    kind: 'list',
    displayMode: 'sidebar',
    sidebarOrder: 15,
    title: 'Followups',
    description:
      'Orders with an open follow-up due today or overdue — call center callback queue.',
    showInNav: true,
    followUpDue: true,
  },
  {
    slug: 'failed',
    label: 'Failed Orders',
    href: '/dashboard/orders/failed',
    kind: 'failed',
    displayMode: 'sidebar',
    sidebarOrder: 40,
    title: 'Failed Orders',
    description: 'Duplicate, blocked, or invalid orders for manual review.',
    showInNav: true,
  },
  {
    slug: 'bulk_print',
    label: 'Bulk Print',
    href: '/dashboard/orders/tools/bulk-print',
    kind: 'tool',
    displayMode: 'sidebar',
    sidebarOrder: 50,
    title: 'Bulk Print',
    description: 'Print invoices and packing slips in bulk.',
    showInNav: true,
  },
  {
    slug: 'send_courier_barcode',
    label: 'Send Courier by Barcode',
    href: '/dashboard/orders/tools/send-courier-barcode',
    kind: 'tool',
    displayMode: 'sidebar',
    sidebarOrder: 51,
    title: 'Send Courier by Barcode',
    description: 'Submit orders to courier using barcode scan.',
    showInNav: true,
  },
  {
    slug: 'payments',
    label: 'Payments',
    href: '/dashboard/orders/payments',
    kind: 'payments',
    displayMode: 'sidebar',
    sidebarOrder: 52,
    title: 'Order Payments',
    description: 'Payment ledger and collection tracking.',
    showInNav: true,
  },
  {
    slug: 'more_statuses',
    label: 'More Statuses',
    href: '/dashboard/orders/statuses',
    kind: 'list',
    displayMode: 'sidebar',
    sidebarOrder: 60,
    title: 'All Statuses',
    description: 'Browse and open any order status queue.',
    showInNav: false,
  },
];

export function getStatusConfigBySlug(slug: string): OrderStatusConfig | undefined {
  return getOrderStatuses().find((item) => item.slug === slug);
}

export function getQueuePageBySlug(slug: string): OrderQueuePage | undefined {
  return getOrderQueuePages().find((item) => item.slug === slug) ??
    MOCK_ORDER_QUEUE_PAGES.find((item) => item.slug === slug);
}

export function getSidebarStatuses(): OrderStatusConfig[] {
  return getOrderStatuses()
    .filter((item) => statusShowsInSidebar(item))
    .sort((a, b) => (a.sidebarOrder ?? 99) - (b.sidebarOrder ?? 99));
}

export function getNestedTabStatusesForParent(parentSlug: string): OrderStatusConfig[] {
  return getOrderStatuses()
    .filter((item) => item.parentSlug === parentSlug && statusShowsInNestedTabs(item))
    .sort((a, b) => (a.sidebarOrder ?? 99) - (b.sidebarOrder ?? 99));
}

/** Child status slugs for a queue/status parent — derived from config only (no hardcoded fallbacks). */
export function getQueueChildStatusSlugs(queueSlug: string): string[] {
  return getNestedTabStatusesForParent(queueSlug).map((item) => item.slug);
}

export function getGroupByStatusItems(): OrderStatusConfig[] {
  return getOrderStatuses().filter((item) => item.showInGroupByStatus);
}
