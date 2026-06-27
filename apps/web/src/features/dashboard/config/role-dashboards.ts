import type { UserRole } from '@laam/types';
import { ROLE_LABELS } from '@laam/types';

/** Roles that share the Sales Head dashboard layout (extend per COO spec). */
export const SALES_HEAD_ROLES: UserRole[] = [
  'sales_manager',
  'org_admin',
  'super_admin',
];

/** Roles that share the Agent dashboard layout. */
export const AGENT_ROLES: UserRole[] = ['sales_rep'];

export function isSalesHeadRole(role: UserRole): boolean {
  return SALES_HEAD_ROLES.includes(role);
}

export function isAgentRole(role: UserRole): boolean {
  return AGENT_ROLES.includes(role);
}

export function getDashboardTitle(role: UserRole): string {
  if (isSalesHeadRole(role)) {
    return 'Sales Head Dashboard';
  }

  if (isAgentRole(role)) {
    return 'Agent Dashboard';
  }

  return `${ROLE_LABELS[role]} Dashboard`;
}
