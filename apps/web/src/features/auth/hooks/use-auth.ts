'use client';

import { ROLE_LABELS, type UserRole } from '@laam/types';
import { useAuthContext } from '@/features/auth/providers/auth-provider';
import {
  isAgentRole,
  isMarketingHeadRole,
  isSalesHeadRole,
} from '@/features/dashboard/config/role-dashboards';

function getRoleLabel(role: UserRole): string {
  if (isSalesHeadRole(role)) {
    return 'Sales Head';
  }

  if (isAgentRole(role)) {
    return 'Agent';
  }

  if (isMarketingHeadRole(role)) {
    return 'Marketing Head';
  }

  return ROLE_LABELS[role];
}

export function useAuth() {
  const auth = useAuthContext();

  return {
    ...auth,
    roleLabel: auth.user ? getRoleLabel(auth.user.role) : null,
    isLoading: auth.status === 'loading',
    isAuthenticated: auth.status === 'authenticated',
  };
}
