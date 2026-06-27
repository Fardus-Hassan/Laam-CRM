import type { Permission } from '@laam/types';
import { hasPermission } from '@laam/types';
import {
  NAV_GROUP_LABELS,
  NAV_GROUP_ORDER,
  NAV_ITEMS,
  NAV_SIDEBAR_ORDER,
  type NavItemDefinition,
} from '@/features/navigation/config/nav-registry';

export type ResolvedNavItem = NavItemDefinition;

export type ResolvedNavGroup = {
  id: (typeof NAV_GROUP_ORDER)[number];
  label: string;
  items: ResolvedNavItem[];
};

export function filterNavigation(
  userPermissions: readonly Permission[],
): ResolvedNavGroup[] {
  const visibleItems = NAV_ITEMS.filter((item) =>
    hasPermission(userPermissions, item.permissions),
  );

  return NAV_GROUP_ORDER.map((groupId) => ({
    id: groupId,
    label: NAV_GROUP_LABELS[groupId],
    items: visibleItems.filter((item) => item.group === groupId),
  })).filter((group) => group.items.length > 0);
}

export function filterFlatNavigation(
  userPermissions: readonly Permission[],
): ResolvedNavItem[] {
  const visibleById = new Map(
    NAV_ITEMS.filter((item) => hasPermission(userPermissions, item.permissions)).map(
      (item) => [item.id, item],
    ),
  );

  return NAV_SIDEBAR_ORDER.map((id) => visibleById.get(id)).filter(
    (item): item is ResolvedNavItem => item !== undefined,
  );
}

export function getNavItemById(id: ResolvedNavItem['id']) {
  return NAV_ITEMS.find((item) => item.id === id);
}
