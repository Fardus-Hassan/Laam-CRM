'use client';

import * as React from 'react';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { filterNavigation } from '@/features/navigation/lib/filter-navigation';

export function useNavigation() {
  const { permissions } = usePermissions();

  return React.useMemo(
    () => filterNavigation(permissions),
    [permissions],
  );
}
