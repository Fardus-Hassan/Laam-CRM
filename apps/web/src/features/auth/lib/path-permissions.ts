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

/** Known dashboard routes not always listed as top-level nav URLs. */
const EXTRA_DASHBOARD_PATH_PERMISSIONS: Record<string, Permission[]> = {
  '/dashboard/deals': ['deals.view'],
  '/dashboard/pipeline': ['pipeline.view'],
  '/dashboard/companies': ['companies.view'],
  '/dashboard/orders': ['orders.view'],
  '/dashboard/activities': ['activities.view'],
  '/dashboard/inventory': ['inventory.view'],
  '/dashboard/inventory/brands': ['inventory.view'],
  '/dashboard/inventory/products/new': ['inventory.create'],
  '/dashboard/inventory/warehouses': ['inventory.view', 'inventory.warehouses'],
  '/dashboard/inventory/mixer': ['inventory.view', 'inventory.mixer'],
  '/dashboard/inventory/purchase-returns': ['inventory.purchase'],
  '/dashboard/accounting': ['accounting.view'],
  // Own password / security — any signed-in user (OTP inbox gated in-page).
  '/dashboard/settings/brand': ['brand.view', 'brand.manage', 'settings.manage'],
  '/dashboard/settings/categories': [
    'settings.manage',
    'inventory.view',
    'inventory.create',
    'inventory.edit',
  ],
  '/dashboard/notifications': ['notifications.view'],
  '/dashboard/platform/brand': ['platform.view', 'platform.manage'],
  '/dashboard/platform/tenants': ['platform.view', 'platform.manage'],
  '/dashboard/users': ['users.view', 'users.manage', 'users.invite'],
};

/**
 * Personal account routes — available to every authenticated user.
 * Page UI still gates admin-only sections (e.g. Staff OTP inbox).
 */
const AUTHENTICATED_ONLY_PATHS = new Set<string>(['/dashboard/settings/security']);

let cachedMap: Map<string, Permission[]> | null = null;

function pathPermissionMap(): Map<string, Permission[]> {
  if (!cachedMap) {
    cachedMap = new Map();
    for (const group of getUniversalNavRegistry()) {
      collectUrlPermissions(group.items, cachedMap);
    }
    for (const [path, permissions] of Object.entries(EXTRA_DASHBOARD_PATH_PERMISSIONS)) {
      const existing = cachedMap.get(path) ?? [];
      cachedMap.set(path, [...new Set([...existing, ...permissions])]);
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
  const path = normalizePath(pathname);

  if (AUTHENTICATED_ONLY_PATHS.has(path)) {
    return true;
  }

  const required = requiredPermissionsForPath(pathname);

  // Unmapped /dashboard/* routes are denied (nav + extras are the allowlist).
  if (!required?.length) {
    if (path === '/dashboard' || path.startsWith('/dashboard/')) {
      return false;
    }
    return true;
  }

  return hasPermission(userPermissions, required, 'any');
}
