'use client';

import { ROLE_LABELS } from '@laam/types';
import { useAuthContext } from '@/features/auth/providers/auth-provider';

export function useAuth() {
  const auth = useAuthContext();

  return {
    ...auth,
    roleLabel: auth.user ? ROLE_LABELS[auth.user.role] : null,
    isLoading: auth.status === 'loading',
    isAuthenticated: auth.status === 'authenticated',
  };
}
