import type { UserRole } from '@laam/types';

import {
  isAgentRole,
  isCeoRole,
  isMarketingHeadRole,
  isSalesHeadRole,
  isSuperAdminRole,
  isTeamLeaderRole,
} from '@/features/dashboard/config/role-dashboards';

export type DemoDashboardView = {
  id: 'sales_head' | 'agent' | 'marketing_head' | 'ceo' | 'team_leader' | 'super_admin';
  label: string;
  role: UserRole;
};

/** Temporary demo switcher — dashboards built so far. */
export const DEMO_DASHBOARD_VIEWS: DemoDashboardView[] = [
  { id: 'sales_head', label: 'Sales Head', role: 'sales_manager' },
  { id: 'agent', label: 'Agent', role: 'sales_rep' },
  { id: 'marketing_head', label: 'Marketing Head', role: 'marketing_head' },
  { id: 'ceo', label: 'CEO', role: 'ceo' },
  { id: 'team_leader', label: 'Team Leader', role: 'team_leader' },
  { id: 'super_admin', label: 'Super Admin', role: 'super_admin' },
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

  if (view.id === 'marketing_head') {
    return isMarketingHeadRole(role);
  }

  if (view.id === 'ceo') {
    return isCeoRole(role);
  }

  if (view.id === 'team_leader') {
    return isTeamLeaderRole(role);
  }

  if (view.id === 'super_admin') {
    return isSuperAdminRole(role);
  }

  return false;
}
