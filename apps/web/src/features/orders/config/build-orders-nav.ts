import type { OrderStatusConfig, Permission } from '@laam/types';

import type { NavChildDefinition } from '@/features/navigation/types/universal-nav';
import {
  getFailedOrdersBadgeCount,
  getFollowupsDueBadgeCount,
  getStatusCount,
} from '@/features/orders/data/order-status-counts-store';
import { MOCK_ORDER_QUEUE_PAGES } from '@/features/orders/data/mock-status-config';
import { getOrderStatuses } from '@/features/orders/data/order-status-store';
import {
  getSidebarChildStatuses,
  STATUS_QUEUE_FOLDER_SLUGS,
} from '@/features/orders/lib/order-status-hierarchy';
import { statusShowsInSidebar } from '@/features/orders/lib/order-status-visibility';

export type OrdersNavChild = NavChildDefinition & {
  badge?: number;
};

const TOOL_SLUGS = new Set(['failed', 'bulk_print', 'send_courier_barcode', 'payments']);
const QUEUE_SLUGS = new Set(['create_new', 'all', 'pendings', 'followups']);

function statusNavUrl(status: OrderStatusConfig): string {
  if (status.parentSlug && STATUS_QUEUE_FOLDER_SLUGS.has(status.parentSlug)) {
    return `/dashboard/orders/queues/${status.parentSlug}?status=${status.slug}`;
  }
  return `/dashboard/orders?status=${status.slug}`;
}

function sumStatusBadges(slugs: string[]): number | undefined {
  const total = slugs.reduce((sum, slug) => sum + getStatusCount(slug), 0);
  return total > 0 ? total : undefined;
}

function statusToNavItem(
  status: OrderStatusConfig,
  sidebarStatuses: OrderStatusConfig[],
  visited: Set<string>,
): OrdersNavChild {
  if (visited.has(status.slug)) {
    return {
      id: `orders-status-${status.slug}`,
      title: status.label,
      url: statusNavUrl(status),
      permissions: ['orders.view'] as Permission[],
    };
  }
  visited.add(status.slug);

  const nested = sidebarStatuses
    .filter((child) => child.parentSlug === status.slug)
    .map((child) => statusToNavItem(child, sidebarStatuses, visited));

  const count = getStatusCount(status.slug);
  const childBadge = sumStatusBadges(nested.map((item) => item.id.replace('orders-status-', '')));
  const badge = count > 0 ? count : childBadge;

  return {
    id: `orders-status-${status.slug}`,
    title: status.label,
    url: statusNavUrl(status),
    permissions: ['orders.view'] as Permission[],
    badge,
    children: nested.length > 0 ? nested : undefined,
  };
}

function pageToNavItem(
  page: (typeof MOCK_ORDER_QUEUE_PAGES)[number],
  sidebarStatuses: OrderStatusConfig[],
): OrdersNavChild {
  let badge: number | undefined;

  if (page.slug === 'failed') {
    const count = getFailedOrdersBadgeCount();
    badge = count > 0 ? count : undefined;
  } else if (page.slug === 'followups') {
    const count = getFollowupsDueBadgeCount();
    badge = count > 0 ? count : undefined;
  } else if (STATUS_QUEUE_FOLDER_SLUGS.has(page.slug)) {
    const childSlugs = getSidebarChildStatuses(page.slug).map((status) => status.slug);
    badge = sumStatusBadges(childSlugs);
  }

  const nestedStatuses = getSidebarChildStatuses(page.slug).map((status) =>
    statusToNavItem(status, sidebarStatuses, new Set()),
  );

  return {
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
}

function isTopLevelSidebarStatus(
  status: OrderStatusConfig,
  sidebarSlugs: Set<string>,
): boolean {
  if (!status.parentSlug) return true;
  if (STATUS_QUEUE_FOLDER_SLUGS.has(status.parentSlug)) return false;
  if (sidebarSlugs.has(status.parentSlug)) return false;
  // Orphaned parent reference → surface as top-level so it is not lost
  return true;
}

export function buildOrdersNav(): OrdersNavChild[] {
  const navPages = MOCK_ORDER_QUEUE_PAGES.filter(
    (page) => page.showInNav && page.slug !== 'more_statuses',
  );

  const sidebarStatuses = getOrderStatuses()
    .filter((status) => statusShowsInSidebar(status))
    .sort((a, b) => (a.sidebarOrder ?? 99) - (b.sidebarOrder ?? 99));

  const sidebarSlugs = new Set(sidebarStatuses.map((status) => status.slug));

  const queuePages = navPages
    .filter((page) => QUEUE_SLUGS.has(page.slug))
    .sort((a, b) => a.sidebarOrder - b.sidebarOrder)
    .map((page) => pageToNavItem(page, sidebarStatuses));

  const topLevelStatuses = sidebarStatuses
    .filter((status) => isTopLevelSidebarStatus(status, sidebarSlugs))
    .map((status) => statusToNavItem(status, sidebarStatuses, new Set()));

  const toolPages = navPages
    .filter((page) => TOOL_SLUGS.has(page.slug))
    .sort((a, b) => a.sidebarOrder - b.sidebarOrder)
    .map((page) => pageToNavItem(page, sidebarStatuses));

  return [...queuePages, ...topLevelStatuses, ...toolPages];
}
