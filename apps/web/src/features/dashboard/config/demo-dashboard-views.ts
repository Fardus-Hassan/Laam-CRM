import type { UserRole } from '@laam/types';

import {
  isAgentRole,
  isSalesHeadRole,
} from '@/features/dashboard/config/role-dashboards';

export type DemoDashboardView = {
  id: 'sales_head' | 'agent';
  label: string;
  role: UserRole;
};

/** Temporary demo switcher — only dashboards built so far. */
export const DEMO_DASHBOARD_VIEWS: DemoDashboardView[] = [
  { id: 'sales_head', label: 'Sales Head', role: 'sales_manager' },
  { id: 'agent', label: 'Agent', role: 'sales_rep' },
];

export function isDemoDashboardViewActive(
  view: DemoDashboardView,
  role: UserRole,
): boolean {
  if (view.id === 'sales_head') {
    return isSalesHeadRole(role);
  }

  if (view.id === 'agent') {
    return isAgentRole(role);
  }

  return false;
}
