import { ROLE_LABELS, type SessionUser, type UserRole } from '@laam/types';
import {
  isAgentRole,
  isMarketingHeadRole,
  isSalesHeadRole,
} from '@/features/dashboard/config/role-dashboards';

/** Friendly label for the signed-in role (custom role name wins). */
export function getRoleLabelForUser(
  user: Pick<SessionUser, 'role' | 'customRoleName'>,
): string {
  if (user.customRoleName?.trim()) {
    return user.customRoleName.trim();
  }

  if (isSalesHeadRole(user.role)) {
    return 'Sales Head';
  }
  if (isAgentRole(user.role)) {
    return 'Agent';
  }
  if (isMarketingHeadRole(user.role)) {
    return 'Marketing Head';
  }

  return ROLE_LABELS[user.role as UserRole] ?? user.role;
}
