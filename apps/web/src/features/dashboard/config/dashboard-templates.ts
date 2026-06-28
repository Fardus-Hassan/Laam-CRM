import type { DashboardTemplate, SessionUser } from '@laam/types';
import { ROLE_DASHBOARD_TEMPLATE } from '@laam/types';
import type { UserRole } from '@laam/types';

export function resolveDashboardTemplate(user: SessionUser): DashboardTemplate {
  return user.dashboardTemplate ?? ROLE_DASHBOARD_TEMPLATE[user.role] ?? 'default';
}

/** Maps dashboard template to mock API role for data fetching (prototype). */
export function getDashboardRoleForTemplate(template: DashboardTemplate): UserRole {
  const map: Record<DashboardTemplate, UserRole> = {
    platform: 'super_admin',
    executive: 'ceo',
    sales_head: 'sales_manager',
    team_leader: 'team_leader',
    agent: 'sales_rep',
    marketing: 'marketing_head',
    support: 'support_agent',
    finance: 'finance',
    default: 'viewer',
  };

  return map[template];
}

export function getDashboardTitleForTemplate(template: DashboardTemplate): string {
  const titles: Record<DashboardTemplate, string> = {
    platform: 'Super Admin Dashboard',
    executive: 'CEO Dashboard',
    sales_head: 'Sales Head Dashboard',
    team_leader: 'Team Leader Dashboard',
    agent: 'Agent Dashboard',
    marketing: 'Marketing Head Dashboard',
    support: 'Support Dashboard',
    finance: 'Finance Dashboard',
    default: 'Dashboard',
  };

  return titles[template];
}
