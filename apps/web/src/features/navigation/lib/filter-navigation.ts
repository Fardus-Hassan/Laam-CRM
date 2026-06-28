import type { Permission } from '@laam/types';
import { hasPermission } from '@laam/types';

import { UNIVERSAL_NAV_REGISTRY } from '@/features/navigation/config/universal-nav-registry';
import type {
  ResolvedNavChild,
  ResolvedNavGroup,
  ResolvedNavItem,
  UniversalNavItem,
} from '@/features/navigation/types/universal-nav';

function filterNavChildren(
  children: UniversalNavItem['children'],
  userPermissions: readonly Permission[],
): ResolvedNavChild[] | undefined {
  if (!children?.length) {
    return undefined;
  }

  const visible = children.filter((child) =>
    hasPermission(userPermissions, child.permissions),
  );

  return visible.length > 0 ? visible : undefined;
}

function filterNavItem(
  item: UniversalNavItem,
  userPermissions: readonly Permission[],
): ResolvedNavItem | null {
  const visibleChildren = filterNavChildren(item.children, userPermissions);
  const canViewParent = hasPermission(userPermissions, item.permissions);

  if (!canViewParent && !visibleChildren?.length) {
    return null;
  }

  if (item.children?.length) {
    if (!visibleChildren?.length) {
      return null;
    }

    return {
      ...item,
      children: visibleChildren,
    };
  }

  if (!canViewParent || !item.url) {
    return null;
  }

  return { ...item };
}

export function filterNavigation(
  userPermissions: readonly Permission[],
): ResolvedNavGroup[] {
  return UNIVERSAL_NAV_REGISTRY.map((group) => {
    const items = group.items
      .map((item) => filterNavItem(item, userPermissions))
      .filter((item): item is ResolvedNavItem => item !== null);

    return {
      id: group.id,
      label: group.label,
      items,
    };
  }).filter((group) => group.items.length > 0);
}
