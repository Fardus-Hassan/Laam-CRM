import type { Permission } from '@laam/types';

import type { NavChildDefinition } from '@/features/navigation/types/universal-nav';
import { mockFailedOrderStore } from '@/features/orders/data/mock-failed-orders';
import { getStatusCount } from '@/features/orders/data/mock-status-counts';
import {
  getSidebarStatuses,
  MOCK_ORDER_QUEUE_PAGES,
} from '@/features/orders/data/mock-status-config';

export type OrdersNavChild = NavChildDefinition & {
  badge?: number;
};

const TOOL_SLUGS = new Set(['failed', 'bulk_print', 'send_courier_barcode', 'payments']);
const QUEUE_SLUGS = new Set(['create_new', 'all', 'pendings']);

function pageToNavItem(page: (typeof MOCK_ORDER_QUEUE_PAGES)[number]): OrdersNavChild {
  let badge: number | undefined;

  if (page.slug === 'failed') {
    badge = mockFailedOrderStore.length;
  } else if (page.slug === 'pendings') {
    badge =
      getStatusCount('pending') +
      getStatusCount('pending_2') +
      getStatusCount('pending_3');
  } else if (page.childStatusSlugs?.length) {
    badge = page.childStatusSlugs.reduce((sum, slug) => sum + getStatusCount(slug), 0);
  }

  return {
    id: `orders-${page.slug}`,
    title: page.label,
    url: page.href,
    permissions:
      page.kind === 'form'
        ? (['orders.create'] as Permission[])
        : (['orders.view'] as Permission[]),
    badge,
  };
}

export function buildOrdersNav(): OrdersNavChild[] {
  const navPages = MOCK_ORDER_QUEUE_PAGES.filter(
    (page) => page.showInNav && page.slug !== 'more_statuses',
  );

  const queuePages = navPages.filter((p) => QUEUE_SLUGS.has(p.slug));
  const toolPages = navPages.filter((p) => TOOL_SLUGS.has(p.slug));

  const items: OrdersNavChild[] = [
    ...queuePages.sort((a, b) => a.sidebarOrder - b.sidebarOrder).map(pageToNavItem),
    ...getSidebarStatuses()
      .filter((status) => status.parentSlug !== 'pendings')
      .map((status) => ({
        id: `orders-status-${status.slug}`,
        title: status.label,
        url: `/dashboard/orders?status=${status.slug}`,
        permissions: ['orders.view'] as Permission[],
        badge: getStatusCount(status.slug),
      })),
    ...toolPages.sort((a, b) => a.sidebarOrder - b.sidebarOrder).map(pageToNavItem),
    {
      id: 'orders-more-statuses',
      title: 'More Statuses',
      url: '/dashboard/orders/statuses',
      permissions: ['orders.view'] as Permission[],
    },
  ];

  return items;
}
