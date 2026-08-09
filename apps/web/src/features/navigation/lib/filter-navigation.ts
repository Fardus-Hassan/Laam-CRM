import type { Permission } from '@laam/types';
import { hasPermission } from '@laam/types';

import { getUniversalNavRegistry } from '@/features/navigation/config/universal-nav-registry';
import type {
  NavChildDefinition,
  ResolvedNavChild,
  ResolvedNavGroup,
  ResolvedNavItem,
  UniversalNavItem,
} from '@/features/navigation/types/universal-nav';

function filterNavChild(
  child: NavChildDefinition,
  userPermissions: readonly Permission[],
): ResolvedNavChild | null {
  const nested = child.children
    ?.map((item) => filterNavChild(item, userPermissions))
    .filter((item): item is ResolvedNavChild => item !== null);

  const canView = hasPermission(userPermissions, child.permissions);

  if (canView && child.url) {
    return {
      ...child,
      children: nested?.length ? nested : undefined,
    };
  }

  if (nested?.length) {
    return {
      ...child,
      children: nested,
    };
  }

  return null;
}

function filterNavChildren(
  children: UniversalNavItem['children'],
  userPermissions: readonly Permission[],
): ResolvedNavChild[] | undefined {
  if (!children?.length) {
    return undefined;
  }

  const visible = children
    .map((child) => filterNavChild(child, userPermissions))
    .filter((child): child is ResolvedNavChild => child !== null);

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
  options?: { includePlatform?: boolean },
): ResolvedNavGroup[] {
  const includePlatform = options?.includePlatform === true;

  return getUniversalNavRegistry()
    .filter((group) => includePlatform || group.id !== 'platform')
    .map((group) => {
      const items = group.items
        .map((item) => filterNavItem(item, userPermissions))
        .filter((item): item is ResolvedNavItem => item !== null);

      return {
        id: group.id,
        label: group.label,
        items,
      };
    })
    .filter((group) => group.items.length > 0);
}
