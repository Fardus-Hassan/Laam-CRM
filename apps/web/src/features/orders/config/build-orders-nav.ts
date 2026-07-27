import type { OrderQueuePage, OrderStatusConfig, Permission } from '@laam/types';

import type { NavChildDefinition } from '@/features/navigation/types/universal-nav';
import {
  getFailedOrdersBadgeCount,
  getFollowupsDueBadgeCount,
  getStatusCount,
} from '@/features/orders/data/order-status-counts-store';
import { getOrderQueuePages, getOrderStatuses } from '@/features/orders/data/order-status-store';
import {
  getSidebarChildStatuses,
  getStatusQueueFolderSlugs,
} from '@/features/orders/lib/order-status-hierarchy';
import { statusShowsInSidebar } from '@/features/orders/lib/order-status-visibility';

export type OrdersNavChild = NavChildDefinition & {
  badge?: number;
};

const TOOL_KINDS = new Set(['failed', 'tool', 'payments']);

function statusNavUrl(status: OrderStatusConfig): string {
  const folders = getStatusQueueFolderSlugs();
  if (status.parentSlug && folders.has(status.parentSlug)) {
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
  page: OrderQueuePage,
  sidebarStatuses: OrderStatusConfig[],
  folders: Set<string>,
): OrdersNavChild {
  let badge: number | undefined;

  if (page.slug === 'failed') {
    const count = getFailedOrdersBadgeCount();
    badge = count > 0 ? count : undefined;
  } else if (page.followUpDue || page.slug === 'followups') {
    const count = getFollowupsDueBadgeCount();
    badge = count > 0 ? count : undefined;
  } else if (folders.has(page.slug)) {
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
  folders: Set<string>,
): boolean {
  if (!status.parentSlug) return true;
  if (folders.has(status.parentSlug)) return false;
  if (sidebarSlugs.has(status.parentSlug)) return false;
  return true;
}

export function buildOrdersNav(): OrdersNavChild[] {
  const folders = getStatusQueueFolderSlugs();
  const navPages = getOrderQueuePages().filter(
    (page) => page.showInNav && page.slug !== 'more_statuses',
  );

  const sidebarStatuses = getOrderStatuses()
    .filter((status) => statusShowsInSidebar(status))
    .sort((a, b) => (a.sidebarOrder ?? 99) - (b.sidebarOrder ?? 99));

  const sidebarSlugs = new Set(sidebarStatuses.map((status) => status.slug));

  const queuePages = navPages
    .filter((page) => page.kind === 'form' || page.kind === 'list')
    .filter((page) => !TOOL_KINDS.has(page.kind) || page.slug === 'all' || page.slug === 'create_new' || folders.has(page.slug) || page.slug === 'pendings' || page.slug === 'followups')
    .sort((a, b) => a.sidebarOrder - b.sidebarOrder)
    .map((page) => pageToNavItem(page, sidebarStatuses, folders));

  // Deduplicate by slug — prefer earlier (form/list queue) entries
  const seen = new Set<string>();
  const uniqueQueues = queuePages.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  const topLevelStatuses = sidebarStatuses
    .filter((status) => isTopLevelSidebarStatus(status, sidebarSlugs, folders))
    .map((status) => statusToNavItem(status, sidebarStatuses, new Set()));

  const toolPages = navPages
    .filter((page) => TOOL_KINDS.has(page.kind))
    .sort((a, b) => a.sidebarOrder - b.sidebarOrder)
    .map((page) => pageToNavItem(page, sidebarStatuses, folders));

  return [...uniqueQueues, ...topLevelStatuses, ...toolPages];
}
