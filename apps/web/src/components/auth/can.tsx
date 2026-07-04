'use client';

import type { Permission } from '@laam/types';

import { usePermissions } from '@/features/auth/hooks/use-permissions';

type CanProps = {
  permission: Permission | Permission[];
  match?: 'any' | 'all';
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function Can({
  permission,
  match = 'any',
  children,
  fallback = null,
}: CanProps) {
  const { can } = usePermissions();

  if (!can(permission, match)) {
    return fallback;
  }

  return children;
}
