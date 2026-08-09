import type { SidebarNavOrder } from '@laam/types';

import type { UniversalNavGroup } from '@/features/navigation/types/universal-nav';

/** Groups managed from Brand settings (exclude platform console). */
export const EDITABLE_SIDEBAR_GROUP_IDS = [
  'main',
  'sales',
  'operations',
  'insights',
  'administration',
] as const;

export function isEditableSidebarGroupId(id: string): boolean {
  return (EDITABLE_SIDEBAR_GROUP_IDS as readonly string[]).includes(id);
}

/** Order status nav nodes — ordered only via Order Statuses settings (`sidebarOrder`). */
export function isOrdersStatusNavId(id: string): boolean {
  return id.startsWith('orders-status-');
}

export function sortByIdOrder<T>(
  items: T[],
  orderIds: string[] | undefined,
  getId: (item: T) => string,
): T[] {
  if (!orderIds?.length) return items;
  const map = new Map(items.map((item) => [getId(item), item]));
  const ordered: T[] = [];
  for (const id of orderIds) {
    const hit = map.get(id);
    if (hit) {
      ordered.push(hit);
      map.delete(id);
    }
  }
  for (const item of map.values()) {
    ordered.push(item);
  }
  return ordered;
}

type NavNode = {
  id: string;
  children?: NavNode[];
};

function collectChildIdsByItem(
  nodes: NavNode[] | undefined,
  into: Record<string, string[]>,
): void {
  if (!nodes?.length) return;
  for (const node of nodes) {
    if (!node.children?.length) continue;
    // Brand never owns status order — Order Statuses page does.
    const brandOwned = node.children.filter((child) => !isOrdersStatusNavId(child.id));
    if (brandOwned.length > 0) {
      into[node.id] = brandOwned.map((child) => child.id);
    }
    collectChildIdsByItem(node.children, into);
  }
}

/**
 * Apply Brand child order only to non-status nodes.
 * Status siblings keep registry order (Order Statuses `sidebarOrder`).
 */
function applyBrandChildOrderPreservingStatuses<T extends NavNode>(
  children: T[],
  brandOrderIds: string[] | undefined,
): T[] {
  if (!brandOrderIds?.length) return children;

  const nonStatus = children.filter((child) => !isOrdersStatusNavId(child.id));
  const orderedNonStatus = sortByIdOrder(
    nonStatus,
    brandOrderIds.filter((id) => !isOrdersStatusNavId(id)),
    (child) => child.id,
  );

  let nonStatusIndex = 0;
  return children.map((child) => {
    if (isOrdersStatusNavId(child.id)) return child;
    return orderedNonStatus[nonStatusIndex++] ?? child;
  });
}

function applyChildrenOrderDeep<T extends NavNode>(
  item: T,
  order?: SidebarNavOrder | null,
): T {
  if (!item.children?.length) return item;

  const orderedChildren = applyBrandChildOrderPreservingStatuses(
    item.children,
    order?.childIdsByItem?.[item.id],
  );

  return {
    ...item,
    children: orderedChildren.map((child) => applyChildrenOrderDeep(child, order)),
  };
}

/** Apply org branding sidebar order after permission filtering. */
export function applySidebarNavOrder(
  groups: UniversalNavGroup[],
  order?: SidebarNavOrder | null,
): UniversalNavGroup[] {
  if (!order) return groups;

  const editable = groups.filter((g) => isEditableSidebarGroupId(g.id));
  const locked = groups.filter((g) => !isEditableSidebarGroupId(g.id));

  const sortedEditable = sortByIdOrder(
    editable,
    order.groupIds?.length ? order.groupIds : undefined,
    (g) => g.id,
  ).map((group) => ({
    ...group,
    items: sortByIdOrder(
      group.items,
      order.itemIdsByGroup?.[group.id],
      (item) => item.id,
    ).map((item) => applyChildrenOrderDeep(item, order)),
  }));

  return [...sortedEditable, ...locked];
}

export function buildSidebarNavOrderFromGroups(
  groups: UniversalNavGroup[],
): SidebarNavOrder {
  const editable = groups.filter((g) => isEditableSidebarGroupId(g.id));
  const childIdsByItem: Record<string, string[]> = {};
  for (const group of editable) {
    collectChildIdsByItem(group.items, childIdsByItem);
  }
  return {
    groupIds: editable.map((g) => g.id),
    itemIdsByGroup: Object.fromEntries(
      editable.map((g) => [g.id, g.items.map((item) => item.id)]),
    ),
    childIdsByItem,
  };
}

export function normalizeSidebarNavOrder(
  order: SidebarNavOrder | null | undefined,
  defaults: SidebarNavOrder,
): SidebarNavOrder {
  if (!order?.groupIds?.length) {
    return {
      ...defaults,
      childIdsByItem: {
        ...defaults.childIdsByItem,
        ...Object.fromEntries(
          Object.entries(order?.childIdsByItem ?? {}).filter(([, ids]) => ids.length > 0),
        ),
      },
    };
  }

  const groupIds = sortByIdOrder(
    defaults.groupIds.map((id) => ({ id })),
    order.groupIds,
    (g) => g.id,
  ).map((g) => g.id);

  const itemIdsByGroup: Record<string, string[]> = {};
  for (const groupId of groupIds) {
    const defaultItems = defaults.itemIdsByGroup[groupId] ?? [];
    itemIdsByGroup[groupId] = sortByIdOrder(
      defaultItems.map((id) => ({ id })),
      order.itemIdsByGroup?.[groupId],
      (i) => i.id,
    ).map((i) => i.id);
  }

  const childIdsByItem: Record<string, string[]> = {};
  const defaultChildren = defaults.childIdsByItem ?? {};
  const allChildParents = new Set([
    ...Object.keys(defaultChildren),
    ...Object.keys(order.childIdsByItem ?? {}),
  ]);
  for (const parentId of allChildParents) {
    const defaultChildIds = defaultChildren[parentId] ?? [];
    if (!defaultChildIds.length) continue;
    childIdsByItem[parentId] = sortByIdOrder(
      defaultChildIds.map((id) => ({ id })),
      order.childIdsByItem?.[parentId],
      (i) => i.id,
    ).map((i) => i.id);
  }

  return { groupIds, itemIdsByGroup, childIdsByItem };
}
