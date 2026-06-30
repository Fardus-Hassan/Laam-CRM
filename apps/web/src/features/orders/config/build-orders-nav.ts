import type { Permission } from '@laam/types';

import type { NavChildDefinition } from '@/features/navigation/types/universal-nav';
import { getStatusCount } from '@/features/orders/data/mock-status-counts';
import {
  getSidebarStatuses,
  MOCK_ORDER_QUEUE_PAGES,
} from '@/features/orders/data/mock-status-config';

export type OrdersNavChild = NavChildDefinition & {
  badge?: number;
};

export function buildOrdersNav(): OrdersNavChild[] {
  const items: OrdersNavChild[] = [];

  const navPages = MOCK_ORDER_QUEUE_PAGES.filter((page) => page.showInNav).sort(
    (a, b) => a.sidebarOrder - b.sidebarOrder,
  );

  for (const page of navPages) {
    if (page.slug === 'more_statuses') {
      continue;
    }

    let badge: number | undefined;

    if (page.slug === 'failed') {
      badge = 227;
    } else if (page.slug === 'pendings') {
      badge =
        getStatusCount('pending') +
        getStatusCount('pending_2') +
        getStatusCount('pending_3');
    } else if (page.childStatusSlugs?.length) {
      badge = page.childStatusSlugs.reduce((sum, slug) => sum + getStatusCount(slug), 0);
    }

    items.push({
      id: `orders-${page.slug}`,
      title: page.label,
      url: page.href,
      permissions: page.kind === 'form' ? (['orders.create'] as Permission[]) : (['orders.view'] as Permission[]),
      badge,
    });
  }

  for (const status of getSidebarStatuses()) {
    if (status.parentSlug === 'pendings') {
      continue;
    }

    items.push({
      id: `orders-status-${status.slug}`,
      title: status.label,
      url: `/dashboard/orders?status=${status.slug}`,
      permissions: ['orders.view'],
      badge: getStatusCount(status.slug),
    });
  }

  items.push({
    id: 'orders-more-statuses',
    title: 'More Statuses',
    url: '/dashboard/orders/statuses',
    permissions: ['orders.view'],
  });

  return items.sort((a, b) => {
    const orderA = MOCK_ORDER_QUEUE_PAGES.find((p) => a.url === p.href)?.sidebarOrder ?? 100;
    const orderB = MOCK_ORDER_QUEUE_PAGES.find((p) => b.url === p.href)?.sidebarOrder ?? 100;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.title.localeCompare(b.title);
  });
}
