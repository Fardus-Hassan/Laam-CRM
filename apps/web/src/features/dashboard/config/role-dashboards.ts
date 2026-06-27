import type { UserRole } from '@laam/types';
import { ROLE_LABELS } from '@laam/types';

/** Roles that share the Sales Head dashboard layout (extend per COO spec). */
export const SALES_HEAD_ROLES: UserRole[] = [
  'sales_manager',
  'org_admin',
];

/** Roles that share the Super Admin dashboard layout. */
export const SUPER_ADMIN_ROLES: UserRole[] = ['super_admin'];

/** Roles that share the Agent dashboard layout. */
export const AGENT_ROLES: UserRole[] = ['sales_rep'];

/** Roles that share the Marketing Head dashboard layout. */
export const MARKETING_HEAD_ROLES: UserRole[] = ['marketing_head'];

/** Roles that share the CEO dashboard layout. */
export const CEO_ROLES: UserRole[] = ['ceo'];

/** Roles that share the Team Leader dashboard layout. */
export const TEAM_LEADER_ROLES: UserRole[] = ['team_leader'];

export function isSalesHeadRole(role: UserRole): boolean {
  return SALES_HEAD_ROLES.includes(role);
}

export function isAgentRole(role: UserRole): boolean {
  return AGENT_ROLES.includes(role);
}

export function isMarketingHeadRole(role: UserRole): boolean {
  return MARKETING_HEAD_ROLES.includes(role);
}

export function isCeoRole(role: UserRole): boolean {
  return CEO_ROLES.includes(role);
}

export function isTeamLeaderRole(role: UserRole): boolean {
  return TEAM_LEADER_ROLES.includes(role);
}

export function isSuperAdminRole(role: UserRole): boolean {
  return SUPER_ADMIN_ROLES.includes(role);
}

export function getDashboardTitle(role: UserRole): string {
  if (isSalesHeadRole(role)) {
    return 'Sales Head Dashboard';
  }

  if (isAgentRole(role)) {
    return 'Agent Dashboard';
  }

  if (isMarketingHeadRole(role)) {
    return 'Marketing Head Dashboard';
  }

  if (isCeoRole(role)) {
    return 'CEO Dashboard';
  }

  if (isTeamLeaderRole(role)) {
    return 'Team Leader Dashboard';
  }

  if (isSuperAdminRole(role)) {
    return 'Super Admin Dashboard';
  }

  return `${ROLE_LABELS[role]} Dashboard`;
}
