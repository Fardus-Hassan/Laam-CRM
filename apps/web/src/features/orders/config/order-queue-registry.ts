import type { OrderStatusType } from '@laam/types';

import {
  MOCK_ORDER_QUEUE_PAGES,
  MOCK_ORDER_STATUSES,
} from '@/features/orders/data/mock-status-config';

/** @deprecated Use OrderQueuePage from order-status-config — kept for backward compatibility. */
export type OrderQueueId = string;

export type OrderQueueKind = 'form' | 'list' | 'failed' | 'tool' | 'payments';

export type OrderQueueDefinition = {
  id: string;
  label: string;
  href: string;
  kind: OrderQueueKind;
  filterStatus?: OrderStatusType;
  title: string;
  description: string;
  showInNav?: boolean;
};

function mapPageKind(kind: string): OrderQueueKind {
  if (kind === 'payments') {
    return 'payments';
  }
  if (kind === 'failed' || kind === 'tool' || kind === 'form' || kind === 'list') {
    return kind;
  }
  return 'list';
}

export const ORDER_QUEUE_REGISTRY: OrderQueueDefinition[] = [
  ...MOCK_ORDER_QUEUE_PAGES.map((page) => ({
    id: page.slug,
    label: page.label,
    href: page.href,
    kind: mapPageKind(page.kind),
    filterStatus: page.childStatusSlugs?.[0],
    title: page.title,
    description: page.description,
    showInNav: page.showInNav,
  })),
  ...MOCK_ORDER_STATUSES.filter((s) => s.displayMode !== 'filter_only').map((status) => ({
    id: status.slug,
    label: status.label,
    href: `/dashboard/orders?status=${status.slug}`,
    kind: 'list' as const,
    filterStatus: status.slug,
    title: `${status.label} Orders`,
    description: `Orders in ${status.label} status.`,
    showInNav: status.displayMode === 'sidebar',
  })),
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
  const match = MOCK_ORDER_STATUSES.find((s) => s.slug === value);
  return match?.slug ?? (value as OrderStatusType);
}

export const ORDER_QUEUE_NAV_ITEMS = ORDER_QUEUE_REGISTRY.filter((q) => q.showInNav);
