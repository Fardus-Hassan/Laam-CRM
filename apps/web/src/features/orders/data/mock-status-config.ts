import type {
  BulkActionId,
  OrderQueuePage,
  OrderStatusConfig,
  OrderStatusType,
} from '@laam/types';

import { getOrderStatuses } from '@/features/orders/data/order-status-store';

const DEFAULT_BULK: BulkActionId[] = [
  'print_selected',
  'print_barcode',
  'print_info',
  'export',
  'send_sms',
  'set_followup',
  'transfer',
  'courier_unlink',
];

const PENDING_BULK: BulkActionId[] = [
  ...DEFAULT_BULK,
  'status_change',
  'update_courier_status',
];

const CONFIRMED_BULK: BulkActionId[] = [
  ...PENDING_BULK,
  'submit_pathao',
  'submit_steadfast',
  'submit_carrybee',
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

/** Food business demo seed — admin can extend in Phase 2. */
export const MOCK_ORDER_STATUSES: OrderStatusConfig[] = [
  status({
    slug: 'pending',
    label: 'Pending',
    labelBn: 'পেন্ডিং',
    color: 'hsl(174 58% 42%)',
    group: 'intake',
    parentSlug: 'pendings',
    displayMode: 'nested_tab',
    isDefault: true,
    allowedTransitions: ['pending_2', 'pending_3', 'confirmed', 'hold', 'cancelled'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'pending_2',
    label: 'Pending 2',
    color: 'hsl(174 48% 38%)',
    group: 'intake',
    parentSlug: 'pendings',
    displayMode: 'nested_tab',
    allowedTransitions: ['pending', 'pending_3', 'confirmed', 'hold', 'cancelled'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'pending_3',
    label: 'Pending 3',
    color: 'hsl(174 38% 34%)',
    group: 'intake',
    parentSlug: 'pendings',
    displayMode: 'sidebar',
    sidebarOrder: 12,
    allowedTransitions: ['pending', 'pending_2', 'confirmed', 'hold', 'cancelled'],
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
    slug: 'confirmed_2',
    label: 'Confirmed 2',
    color: 'hsl(200 50% 40%)',
    group: 'confirm',
    displayMode: 'filter_only',
    allowedTransitions: ['processing', 'in_courier', 'cancelled'],
    bulkActions: CONFIRMED_BULK,
  }),
  status({
    slug: 'hold',
    label: 'Hold',
    color: 'hsl(38 90% 50%)',
    group: 'confirm',
    displayMode: 'sidebar',
    sidebarOrder: 30,
    allowedTransitions: ['pending', 'confirmed', 'cancelled'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'hold_followup',
    label: 'Hold Followup',
    color: 'hsl(38 80% 45%)',
    group: 'confirm',
    displayMode: 'filter_only',
    allowedTransitions: ['hold', 'confirmed', 'cancelled'],
    bulkActions: PENDING_BULK,
  }),
  status({
    slug: 'processing',
    label: 'Processing',
    color: 'hsl(260 45% 55%)',
    group: 'fulfillment',
    displayMode: 'filter_only',
    allowedTransitions: ['in_courier', 'special', 'hold'],
    bulkActions: DEFAULT_BULK,
  }),
  status({
    slug: 'in_courier',
    label: 'In Courier',
    color: 'hsl(220 55% 50%)',
    group: 'fulfillment',
    displayMode: 'sidebar',
    sidebarOrder: 25,
    allowedTransitions: ['delivered', 'pending_return', 'cancelled'],
    bulkActions: [...DEFAULT_BULK, 'update_courier_status'],
  }),
  status({
    slug: 'hand_delivery',
    label: 'Hand Delivery',
    color: 'hsl(160 40% 42%)',
    group: 'delivery',
    displayMode: 'filter_only',
    allowedTransitions: ['hand_delivery_completed', 'delivered'],
    bulkActions: DEFAULT_BULK,
  }),
  status({
    slug: 'delivered',
    label: 'Delivered',
    color: 'hsl(142 50% 40%)',
    group: 'delivery',
    displayMode: 'filter_only',
    allowedTransitions: ['completed', 'pending_return'],
    bulkActions: ['export', 'print_info'],
  }),
  status({
    slug: 'completed',
    label: 'Completed',
    color: 'hsl(142 60% 35%)',
    group: 'terminal',
    displayMode: 'filter_only',
    isTerminal: true,
    allowedTransitions: [],
    bulkActions: ['export', 'print_info'],
  }),
  status({
    slug: 'cancelled',
    label: 'Canceled',
    color: 'hsl(0 60% 50%)',
    group: 'terminal',
    displayMode: 'filter_only',
    isTerminal: true,
    allowedTransitions: [],
    bulkActions: ['export'],
  }),
  status({
    slug: 'pending_return',
    label: 'Pending Return',
    color: 'hsl(15 70% 50%)',
    group: 'returns',
    displayMode: 'filter_only',
    allowedTransitions: ['returned', 'completed'],
    bulkActions: DEFAULT_BULK,
  }),
  status({
    slug: 'returned',
    label: 'Returned',
    color: 'hsl(15 60% 45%)',
    group: 'returns',
    displayMode: 'filter_only',
    isTerminal: true,
    allowedTransitions: [],
    bulkActions: ['export'],
  }),
  status({
    slug: 'return_collection',
    label: 'Return Collection',
    color: 'hsl(15 55% 48%)',
    group: 'returns',
    displayMode: 'filter_only',
    allowedTransitions: ['returned', 'pending_return'],
    bulkActions: DEFAULT_BULK,
  }),
  status({
    slug: 'special',
    label: 'Special',
    color: 'hsl(280 45% 55%)',
    group: 'fulfillment',
    displayMode: 'filter_only',
    allowedTransitions: ['processing', 'in_courier'],
    bulkActions: DEFAULT_BULK,
  }),
  status({
    slug: 'convert',
    label: 'Convert',
    color: 'hsl(300 40% 50%)',
    group: 'confirm',
    displayMode: 'filter_only',
    allowedTransitions: ['confirmed', 'cancelled'],
    bulkActions: PENDING_BULK,
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
    label: 'Pendings',
    href: '/dashboard/orders/queues/pendings',
    kind: 'list',
    displayMode: 'sidebar',
    sidebarOrder: 10,
    childStatusSlugs: ['pending', 'pending_2', 'pending_3'],
    defaultChildSlug: 'pending',
    title: 'Pending Orders',
    description: 'Review and confirm new orders.',
    showInNav: true,
  },
  {
    slug: 'followups',
    label: 'Follow-ups Due',
    href: '/dashboard/orders/queues/followups',
    kind: 'list',
    displayMode: 'sidebar',
    sidebarOrder: 15,
    title: 'Follow-ups Due',
    description: 'Orders pending over 48 hours — need agent follow-up.',
    showInNav: true,
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
    showInNav: true,
  },
];

export function getStatusConfigBySlug(slug: OrderStatusType): OrderStatusConfig | undefined {
  return getOrderStatuses().find((item) => item.slug === slug);
}

export function getQueuePageBySlug(slug: string): OrderQueuePage | undefined {
  return MOCK_ORDER_QUEUE_PAGES.find((item) => item.slug === slug);
}

export function getSidebarStatuses(): OrderStatusConfig[] {
  return getOrderStatuses().filter((item) => item.displayMode === 'sidebar').sort(
    (a, b) => (a.sidebarOrder ?? 99) - (b.sidebarOrder ?? 99),
  );
}

export function getGroupByStatusItems(): OrderStatusConfig[] {
  return getOrderStatuses().filter((item) => item.showInGroupByStatus);
}
