import type { Permission } from '@laam/types';
import { hasPermission } from '@laam/types';
import {
  NAV_GROUP_LABELS,
  NAV_GROUP_ORDER,
  NAV_ITEMS,
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

export function getNavItemById(id: ResolvedNavItem['id']) {
  return NAV_ITEMS.find((item) => item.id === id);
}
