import type { BreadcrumbItemConfig } from '@/components/layout/page-shell';
import { siteConfig } from '@/config/site';
import { getStatusConfigBySlug } from '@/features/orders/data/mock-status-config';
import type { OrderStatusType } from '@laam/types';

export function createOrdersListBreadcrumbs(queueTitle: string): BreadcrumbItemConfig[] {
  return [
    { label: 'Dashboard', href: siteConfig.dashboardRoute },
    { label: 'Orders', href: '/dashboard/orders' },
    { label: queueTitle },
  ];
}

export function createOrderDetailBreadcrumbs(
  orderNumber: string,
  statusSlug: string,
): BreadcrumbItemConfig[] {
  const statusLabel = getStatusConfigBySlug(statusSlug as OrderStatusType)?.label ?? statusSlug;
  return [
    { label: 'Dashboard', href: siteConfig.dashboardRoute },
    { label: 'Orders', href: '/dashboard/orders' },
    { label: statusLabel, href: `/dashboard/orders?status=${statusSlug}` },
    { label: orderNumber },
  ];
}

export function createOrderCreateBreadcrumbs(): BreadcrumbItemConfig[] {
  return [
    { label: 'Dashboard', href: siteConfig.dashboardRoute },
    { label: 'Orders', href: '/dashboard/orders' },
    { label: 'Create' },
  ];
}
