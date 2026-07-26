import type { OrderStatusConfig, Permission } from '@laam/types';

import type { NavChildDefinition } from '@/features/navigation/types/universal-nav';
import {
  getFailedOrdersBadgeCount,
  getFollowupsDueBadgeCount,
  getStatusCount,
} from '@/features/orders/data/order-status-counts-store';
import { MOCK_ORDER_QUEUE_PAGES } from '@/features/orders/data/mock-status-config';
import { getOrderStatuses } from '@/features/orders/data/order-status-store';
import { statusShowsInSidebar } from '@/features/orders/lib/order-status-visibility';

export type OrdersNavChild = NavChildDefinition & {
  badge?: number;
};

const TOOL_SLUGS = new Set(['failed', 'bulk_print', 'send_courier_barcode', 'payments']);
const QUEUE_SLUGS = new Set(['create_new', 'all', 'pendings', 'followups']);
const NAV_QUEUE_SLUGS = new Set([...QUEUE_SLUGS, ...TOOL_SLUGS]);

function statusNavUrl(status: OrderStatusConfig, parentQueueSlug?: string): string {
  if (parentQueueSlug) {
    return `/dashboard/orders/queues/${parentQueueSlug}?status=${status.slug}`;
  }

  return `/dashboard/orders?status=${status.slug}`;
}

function statusToNavItem(
  status: OrderStatusConfig,
  parentQueueSlug?: string,
): OrdersNavChild {
  const count = getStatusCount(status.slug);
  return {
    id: `orders-status-${status.slug}`,
    title: status.label,
    url: statusNavUrl(status, parentQueueSlug),
    permissions: ['orders.view'] as Permission[],
    badge: count > 0 ? count : undefined,
  };
}

function sumStatusBadges(slugs: string[]): number | undefined {
  const total = slugs.reduce((sum, slug) => sum + getStatusCount(slug), 0);
  return total > 0 ? total : undefined;
}

function pageToNavItem(
  page: (typeof MOCK_ORDER_QUEUE_PAGES)[number],
  sidebarStatuses: OrderStatusConfig[],
): OrdersNavChild {
  let badge: number | undefined;

  if (page.slug === 'failed') {
    const count = getFailedOrdersBadgeCount();
    badge = count > 0 ? count : undefined;
  } else if (page.slug === 'pendings') {
    const childSlugs = sidebarStatuses
      .filter((status) => status.parentSlug === 'pendings')
      .map((status) => status.slug);
    badge = sumStatusBadges(childSlugs.length ? childSlugs : ['pending', 'pending_2', 'pending_3']);
  } else if (page.slug === 'followups') {
    const count = getFollowupsDueBadgeCount();
    badge = count > 0 ? count : undefined;
  }

  const nestedStatuses = sidebarStatuses
    .filter((status) => status.parentSlug === page.slug)
    .map((status) => statusToNavItem(status, page.slug));

  const item: OrdersNavChild = {
    id: `orders-${page.slug}`,
    title: page.label,
    url: page.href,
    permissions:
      page.kind === 'form'
        ? (['orders.create'] as Permission[])
        : (['orders.view'] as Permission[]),
    badge,
    children: nestedStatuses.length > 0 ? nestedStatuses : undefined,
  };

  return item;
}

export function buildOrdersNav(): OrdersNavChild[] {
  const navPages = MOCK_ORDER_QUEUE_PAGES.filter(
    (page) => page.showInNav && page.slug !== 'more_statuses',
  );

  const sidebarStatuses = getOrderStatuses()
    .filter((status) => statusShowsInSidebar(status))
    .sort((a, b) => (a.sidebarOrder ?? 99) - (b.sidebarOrder ?? 99));

  const queuePages = navPages
    .filter((page) => QUEUE_SLUGS.has(page.slug))
    .sort((a, b) => a.sidebarOrder - b.sidebarOrder)
    .map((page) => pageToNavItem(page, sidebarStatuses));

  const topLevelStatuses = sidebarStatuses
    .filter((status) => !status.parentSlug || !NAV_QUEUE_SLUGS.has(status.parentSlug))
    .map((status) => statusToNavItem(status));

  const toolPages = navPages
    .filter((page) => TOOL_SLUGS.has(page.slug))
    .sort((a, b) => a.sidebarOrder - b.sidebarOrder)
    .map((page) => pageToNavItem(page, sidebarStatuses));

  return [...queuePages, ...topLevelStatuses, ...toolPages];
}
