import type { DashboardTemplate, UserRole } from '@laam/types';

const ROLE_DASHBOARD_TEMPLATE: Record<
  Exclude<UserRole, 'super_admin'>,
  DashboardTemplate
> = {
  org_admin: 'executive',
  ceo: 'executive',
  team_leader: 'team_leader',
  sales_manager: 'sales_head',
  sales_rep: 'agent',
  marketing_head: 'marketing',
  support_agent: 'support',
  finance: 'finance',
  viewer: 'default',
};

/** Internal auth mapping only — not shown as tenant-facing default roles. */
export function dashboardTemplateForSystemRole(role: UserRole): DashboardTemplate | undefined {
  if (role === 'super_admin') {
    return 'platform';
  }
  return ROLE_DASHBOARD_TEMPLATE[role];
}
