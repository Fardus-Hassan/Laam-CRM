import type { BreadcrumbItemConfig } from '@/components/layout/dashboard-header';
import { LEAD_STATUS_LABELS } from '@/features/leads/config/lead-filters';

export function createLeadsListBreadcrumbs(activeLabel = 'All'): BreadcrumbItemConfig[] {
  return [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Leads', href: '/dashboard/leads' },
    { label: activeLabel },
  ];
}

export function createLeadDetailBreadcrumbs(
  leadNumber: string,
  status?: string,
): BreadcrumbItemConfig[] {
  return [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Leads', href: '/dashboard/leads' },
    {
      label: status ? LEAD_STATUS_LABELS[status as keyof typeof LEAD_STATUS_LABELS] ?? status : 'Pipeline',
      href: status ? `/dashboard/leads?status=${status}` : '/dashboard/leads',
    },
    { label: leadNumber },
  ];
}
