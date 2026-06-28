import type { OrderSource, OrderStatusType } from '@laam/types';

export type OrderStatusFilter = OrderStatusType | 'all';

export const ORDER_STATUS_FILTERS: {
  id: OrderStatusFilter;
  label: string;
  href: string;
}[] = [
  { id: 'all', label: 'All Orders', href: '/dashboard/orders' },
  { id: 'pending', label: 'Pending', href: '/dashboard/orders?status=pending' },
  { id: 'confirmed', label: 'Confirmed', href: '/dashboard/orders?status=confirmed' },
  { id: 'hold', label: 'On Hold', href: '/dashboard/orders?status=hold' },
  { id: 'cancelled', label: 'Cancelled', href: '/dashboard/orders?status=cancelled' },
  { id: 'delivered', label: 'Delivered', href: '/dashboard/orders?status=delivered' },
];

export const ORDER_PAGE_COPY: Record<
  OrderStatusFilter,
  { title: string; description: string }
> = {
  all: {
    title: 'Orders',
    description: 'Manage confirmed, pending, and delivered customer orders.',
  },
  pending: {
    title: 'Pending Orders',
    description: 'New orders waiting for confirmation or agent follow-up.',
  },
  confirmed: {
    title: 'Confirmed Orders',
    description: 'Orders confirmed and ready for dispatch or delivery.',
  },
  hold: {
    title: 'On Hold',
    description: 'Orders paused pending customer callback or verification.',
  },
  cancelled: {
    title: 'Cancelled Orders',
    description: 'Orders cancelled by customer, agent, or system.',
  },
  delivered: {
    title: 'Delivered Orders',
    description: 'Successfully completed and delivered orders.',
  },
  in_progress: {
    title: 'In Progress',
    description: 'Orders currently being processed.',
  },
  follow_up: {
    title: 'Follow Up',
    description: 'Orders requiring agent follow-up.',
  },
};

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  facebook: 'Facebook',
  call: 'Inbound Call',
  ecommerce: 'E-commerce',
  walk_in: 'Walk-in',
};

export function parseOrderStatusFilter(value: string | undefined): OrderStatusFilter {
  if (!value) {
    return 'all';
  }

  const match = ORDER_STATUS_FILTERS.find((item) => item.id === value);
  return match?.id ?? (value as OrderStatusType);
}

export function getOrderPageCopy(status: OrderStatusFilter) {
  return ORDER_PAGE_COPY[status] ?? ORDER_PAGE_COPY.all;
}
