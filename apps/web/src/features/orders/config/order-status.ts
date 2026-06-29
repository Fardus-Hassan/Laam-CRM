import type { OrderSource, OrderStatusType } from '@laam/types';

import {
  getOrderQueuePageCopy,
  ORDER_QUEUE_REGISTRY,
  parseOrderQueueStatus,
} from '@/features/orders/config/order-queue-registry';

export type OrderStatusFilter = OrderStatusType | 'all';

export const ORDER_STATUS_FILTERS = ORDER_QUEUE_REGISTRY.filter((queue) => queue.kind === 'list').map(
  (queue) => ({
    id: (queue.filterStatus ?? 'all') as OrderStatusFilter,
    label: queue.label,
    href: queue.href,
  }),
);

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

  const parsed = parseOrderQueueStatus(value);
  if (parsed) {
    return parsed;
  }

  return value as OrderStatusType;
}

export function getOrderPageCopy(status: OrderStatusFilter) {
  if (status === 'all') {
    return getOrderQueuePageCopy('all');
  }
  return getOrderQueuePageCopy(status);
}
