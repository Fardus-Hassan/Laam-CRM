'use client';

import { useAuthContext } from '@/features/auth/providers/auth-provider';
import { getRoleLabelForUser } from '@/features/auth/lib/role-label';

export function useAuth() {
  const auth = useAuthContext();

  return {
    ...auth,
    roleLabel: auth.user ? getRoleLabelForUser(auth.user) : null,
    isLoading: auth.status === 'loading',
    isAuthenticated: auth.status === 'authenticated',
  };
}
