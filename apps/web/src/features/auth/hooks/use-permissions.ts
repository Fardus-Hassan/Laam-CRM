'use client';

import type { Permission } from '@laam/types';
import { hasPermission } from '@laam/types';
import { useAuth } from '@/features/auth/hooks/use-auth';

export function usePermissions() {
  const { permissions } = useAuth();

  return {
    permissions,
    can: (
      required: Permission | Permission[],
      match: 'any' | 'all' = 'any',
    ) => hasPermission(permissions, required, match),
  };
}
