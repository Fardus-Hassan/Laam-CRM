import type { OrderStatusType } from '@laam/types';

/** Bizmation sidebar queue — maps to shared list filter or separate page. */
export type OrderQueueId =
  | 'create_new'
  | 'all'
  | 'pending'
  | 'pending_2'
  | 'pending_3'
  | 'confirmed'
  | 'confirmed_2'
  | 'convert'
  | 'convert_2'
  | 'failed'
  | 'processing'
  | 'processing_2'
  | 'special'
  | 'special_2'
  | 'hold'
  | 'hold_followup'
  | 'rts_carrybee'
  | 'hand_delivery'
  | 'in_courier'
  | 'cod_changed'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'pending_return'
  | 'returned'
  | 'hand_delivery_completed'
  | 'others'
  | 'others_2'
  | 'return_collection'
  | 'courier_payment_validate'
  | 'bulk_print'
  | 'send_courier_barcode'
  | 'payments';

export type OrderQueueKind = 'form' | 'list' | 'failed' | 'tool';

export type OrderQueueDefinition = {
  id: OrderQueueId;
  label: string;
  href: string;
  kind: OrderQueueKind;
  /** Filter applied on shared list (standard queues). */
  filterStatus?: OrderStatusType;
  title: string;
  description: string;
  showInNav?: boolean;
};

export const ORDER_QUEUE_REGISTRY: OrderQueueDefinition[] = [
  {
    id: 'create_new',
    label: 'Create New',
    href: '/dashboard/orders/new',
    kind: 'form',
    title: 'Create New Order',
    description: 'Manually enter a customer order.',
    showInNav: true,
  },
  {
    id: 'all',
    label: 'All Orders',
    href: '/dashboard/orders',
    kind: 'list',
    title: 'All Orders',
    description: 'Full order list with filters, bulk actions, and sales summary.',
    showInNav: true,
  },
  {
    id: 'pending',
    label: 'Pending',
    href: '/dashboard/orders?status=pending',
    kind: 'list',
    filterStatus: 'pending',
    title: 'Pending Orders',
    description: 'New orders waiting for review, assignment, or confirmation.',
    showInNav: true,
  },
  {
    id: 'pending_2',
    label: 'Pending 2',
    href: '/dashboard/orders?status=pending_2',
    kind: 'list',
    filterStatus: 'pending_2',
    title: 'Pending 2',
    description: 'Secondary pending queue.',
    showInNav: true,
  },
  {
    id: 'pending_3',
    label: 'Pending 3',
    href: '/dashboard/orders?status=pending_3',
    kind: 'list',
    filterStatus: 'pending_3',
    title: 'Pending 3',
    description: 'Tertiary pending queue.',
    showInNav: true,
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    href: '/dashboard/orders?status=confirmed',
    kind: 'list',
    filterStatus: 'confirmed',
    title: 'Confirmed Orders',
    description: 'Orders confirmed and ready for courier submission.',
    showInNav: true,
  },
  {
    id: 'confirmed_2',
    label: 'Confirmed 2',
    href: '/dashboard/orders?status=confirmed_2',
    kind: 'list',
    filterStatus: 'confirmed_2',
    title: 'Confirmed 2',
    description: 'Secondary confirmed queue.',
    showInNav: true,
  },
  {
    id: 'convert',
    label: 'Convert',
    href: '/dashboard/orders?status=convert',
    kind: 'list',
    filterStatus: 'convert',
    title: 'Convert',
    description: 'Orders in convert stage.',
    showInNav: true,
  },
  {
    id: 'convert_2',
    label: 'Convert 2',
    href: '/dashboard/orders?status=convert_2',
    kind: 'list',
    filterStatus: 'convert_2',
    title: 'Convert 2',
    description: 'Secondary convert queue.',
    showInNav: true,
  },
  {
    id: 'failed',
    label: 'Failed Orders',
    href: '/dashboard/orders/failed',
    kind: 'failed',
    title: 'Failed Orders',
    description: 'Duplicate, blocked, or invalid orders for manual review.',
    showInNav: true,
  },
  {
    id: 'processing',
    label: 'Processing',
    href: '/dashboard/orders?status=processing',
    kind: 'list',
    filterStatus: 'processing',
    title: 'Processing',
    description: 'Orders being prepared for dispatch.',
    showInNav: true,
  },
  {
    id: 'processing_2',
    label: 'Processing 2',
    href: '/dashboard/orders?status=processing_2',
    kind: 'list',
    filterStatus: 'processing_2',
    title: 'Processing 2',
    description: 'Secondary processing queue.',
    showInNav: true,
  },
  {
    id: 'special',
    label: 'Special',
    href: '/dashboard/orders?status=special',
    kind: 'list',
    filterStatus: 'special',
    title: 'Special',
    description: 'Special handling orders.',
    showInNav: true,
  },
  {
    id: 'special_2',
    label: 'Special 2',
    href: '/dashboard/orders?status=special_2',
    kind: 'list',
    filterStatus: 'special_2',
    title: 'Special 2',
    description: 'Secondary special queue.',
    showInNav: true,
  },
  {
    id: 'hold',
    label: 'Hold',
    href: '/dashboard/orders?status=hold',
    kind: 'list',
    filterStatus: 'hold',
    title: 'On Hold',
    description: 'Orders paused pending customer callback.',
    showInNav: true,
  },
  {
    id: 'hold_followup',
    label: 'Hold Followup',
    href: '/dashboard/orders?status=hold_followup',
    kind: 'list',
    filterStatus: 'hold_followup',
    title: 'Hold Followup',
    description: 'Hold orders scheduled for follow-up.',
    showInNav: true,
  },
  {
    id: 'rts_carrybee',
    label: 'RTS Carrybee',
    href: '/dashboard/orders?status=rts_carrybee',
    kind: 'list',
    filterStatus: 'rts_carrybee',
    title: 'RTS Carrybee',
    description: 'Return-to-sender Carrybee orders.',
    showInNav: true,
  },
  {
    id: 'hand_delivery',
    label: 'Hand Delivery',
    href: '/dashboard/orders?status=hand_delivery',
    kind: 'list',
    filterStatus: 'hand_delivery',
    title: 'Hand Delivery',
    description: 'Orders for manual hand delivery.',
    showInNav: true,
  },
  {
    id: 'in_courier',
    label: 'In Courier',
    href: '/dashboard/orders?status=in_courier',
    kind: 'list',
    filterStatus: 'in_courier',
    title: 'In Courier',
    description: 'Orders submitted to courier with tracking.',
    showInNav: true,
  },
  {
    id: 'cod_changed',
    label: 'COD Changed',
    href: '/dashboard/orders?status=cod_changed',
    kind: 'list',
    filterStatus: 'cod_changed',
    title: 'COD Changed',
    description: 'Orders with COD amount changes.',
    showInNav: true,
  },
  {
    id: 'delivered',
    label: 'Delivered',
    href: '/dashboard/orders?status=delivered',
    kind: 'list',
    filterStatus: 'delivered',
    title: 'Delivered',
    description: 'Courier-delivered orders.',
    showInNav: true,
  },
  {
    id: 'completed',
    label: 'Completed',
    href: '/dashboard/orders?status=completed',
    kind: 'list',
    filterStatus: 'completed',
    title: 'Completed',
    description: 'Closed and completed orders.',
    showInNav: true,
  },
  {
    id: 'cancelled',
    label: 'Canceled',
    href: '/dashboard/orders?status=cancelled',
    kind: 'list',
    filterStatus: 'cancelled',
    title: 'Canceled',
    description: 'Canceled orders.',
    showInNav: true,
  },
  {
    id: 'pending_return',
    label: 'Pending Return',
    href: '/dashboard/orders?status=pending_return',
    kind: 'list',
    filterStatus: 'pending_return',
    title: 'Pending Return',
    description: 'Returns in progress.',
    showInNav: true,
  },
  {
    id: 'returned',
    label: 'Returned',
    href: '/dashboard/orders?status=returned',
    kind: 'list',
    filterStatus: 'returned',
    title: 'Returned',
    description: 'Returned orders — stock restored.',
    showInNav: true,
  },
  {
    id: 'hand_delivery_completed',
    label: 'Hand Delivery Completed',
    href: '/dashboard/orders?status=hand_delivery_completed',
    kind: 'list',
    filterStatus: 'hand_delivery_completed',
    title: 'Hand Delivery Completed',
    description: 'Completed hand deliveries.',
    showInNav: true,
  },
  {
    id: 'others',
    label: 'Others',
    href: '/dashboard/orders?status=others',
    kind: 'list',
    filterStatus: 'others',
    title: 'Others',
    description: 'Miscellaneous order status.',
    showInNav: true,
  },
  {
    id: 'others_2',
    label: 'Others 2',
    href: '/dashboard/orders?status=others_2',
    kind: 'list',
    filterStatus: 'others_2',
    title: 'Others 2',
    description: 'Secondary others queue.',
    showInNav: true,
  },
  {
    id: 'return_collection',
    label: 'Return Collection',
    href: '/dashboard/orders?status=return_collection',
    kind: 'list',
    filterStatus: 'return_collection',
    title: 'Return Collection',
    description: 'Return collection queue.',
    showInNav: false,
  },
  {
    id: 'courier_payment_validate',
    label: 'Courier Payment Validate',
    href: '/dashboard/orders?status=courier_payment_validate',
    kind: 'list',
    filterStatus: 'courier_payment_validate',
    title: 'Courier Payment Validate',
    description: 'Courier payment validation queue.',
    showInNav: false,
  },
  {
    id: 'bulk_print',
    label: 'Bulk Print',
    href: '/dashboard/orders/tools/bulk-print',
    kind: 'tool',
    title: 'Bulk Print',
    description: 'Bulk print tool.',
    showInNav: false,
  },
  {
    id: 'send_courier_barcode',
    label: 'Send Courier by Barcode',
    href: '/dashboard/orders/tools/send-courier-barcode',
    kind: 'tool',
    title: 'Send Courier by Barcode',
    description: 'Barcode courier submission tool.',
    showInNav: false,
  },
  {
    id: 'payments',
    label: 'Payments',
    href: '/dashboard/orders/payments',
    kind: 'tool',
    title: 'Payments',
    description: 'Order payments view.',
    showInNav: false,
  },
];

const registryByStatus = new Map(
  ORDER_QUEUE_REGISTRY.filter((q) => q.filterStatus).map((q) => [q.filterStatus!, q]),
);

export function getOrderQueueByStatus(status: OrderStatusType): OrderQueueDefinition | undefined {
  return registryByStatus.get(status);
}

export function getOrderQueuePageCopy(status: OrderStatusType | 'all') {
  if (status === 'all') {
    return ORDER_QUEUE_REGISTRY.find((q) => q.id === 'all')!;
  }
  return getOrderQueueByStatus(status) ?? ORDER_QUEUE_REGISTRY.find((q) => q.id === 'all')!;
}

export function parseOrderQueueStatus(value: string | undefined): OrderStatusType | undefined {
  if (!value) {
    return undefined;
  }
  const match = ORDER_QUEUE_REGISTRY.find((q) => q.filterStatus === value);
  return match?.filterStatus ?? (value as OrderStatusType);
}

export const ORDER_QUEUE_NAV_ITEMS = ORDER_QUEUE_REGISTRY.filter((q) => q.showInNav);
