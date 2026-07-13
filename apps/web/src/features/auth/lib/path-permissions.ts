import type { Permission } from '@laam/types';
import { hasPermission } from '@laam/types';

import { getUniversalNavRegistry } from '@/features/navigation/config/universal-nav-registry';
import type { NavChildDefinition, UniversalNavItem } from '@/features/navigation/types/universal-nav';

function normalizePath(pathname: string): string {
  const clean = pathname.split('?')[0] ?? pathname;
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.slice(0, -1);
  }
  return clean;
}

function collectUrlPermissions(
  items: UniversalNavItem[] | NavChildDefinition[],
  map: Map<string, Permission[]>,
) {
  for (const item of items) {
    if ('url' in item && item.url) {
      const path = normalizePath(item.url);
      const existing = map.get(path) ?? [];
      map.set(path, [...new Set([...existing, ...item.permissions])]);
    }
    if (item.children?.length) {
      collectUrlPermissions(item.children, map);
    }
  }
}

let cachedMap: Map<string, Permission[]> | null = null;

function pathPermissionMap(): Map<string, Permission[]> {
  if (!cachedMap) {
    cachedMap = new Map();
    for (const group of getUniversalNavRegistry()) {
      collectUrlPermissions(group.items, cachedMap);
    }
  }
  return cachedMap;
}

/** Returns required permissions for a dashboard path, or null if unrestricted / unknown. */
export function requiredPermissionsForPath(pathname: string): Permission[] | null {
  const path = normalizePath(pathname);
  const map = pathPermissionMap();

  if (map.has(path)) {
    return map.get(path) ?? null;
  }

  // Longest prefix match for dynamic segments (e.g. /dashboard/orders/queues/foo)
  let best: { path: string; permissions: Permission[] } | null = null;
  for (const [candidate, permissions] of map.entries()) {
    if (path === candidate || path.startsWith(`${candidate}/`)) {
      if (!best || candidate.length > best.path.length) {
        best = { path: candidate, permissions };
      }
    }
  }

  return best?.permissions ?? null;
}

export function canAccessPath(
  pathname: string,
  userPermissions: readonly Permission[],
): boolean {
  const required = requiredPermissionsForPath(pathname);
  if (!required?.length) {
    return true;
  }
  return hasPermission(userPermissions, required, 'any');
}
