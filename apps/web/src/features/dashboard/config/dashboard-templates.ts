import type { DashboardTemplate, SessionUser } from '@laam/types';
import { ROLE_DASHBOARD_TEMPLATE, ROLE_LABELS } from '@laam/types';
import type { UserRole } from '@laam/types';
import { getRoleLabelForUser } from '@/features/auth/lib/role-label';

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
    executive: 'Executive Dashboard',
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

/** Title + welcome that match the signed-in user's role (not hardcoded mock copy). */
export function getDashboardChromeForUser(user: SessionUser): {
  title: string;
  welcomeMessage: string;
  subtitle: string;
} {
  const roleLabel = getRoleLabelForUser(user);
  const template = resolveDashboardTemplate(user);

  let title = getDashboardTitleForTemplate(template);
  if (user.role === 'ceo') {
    title = 'CEO Dashboard';
  } else if (user.role === 'org_admin' && template === 'executive') {
    title = 'Org Admin Dashboard';
  } else if (user.customRoleName?.trim() && template !== 'default') {
    title = `${roleLabel} Dashboard`;
  }

  return {
    title,
    welcomeMessage: `Welcome back, ${user.name.split(' ')[0] || roleLabel}!`,
    subtitle:
      template === 'executive'
        ? 'Executive overview of business performance'
        : `${ROLE_LABELS[user.role]} workspace overview`,
  };
}
