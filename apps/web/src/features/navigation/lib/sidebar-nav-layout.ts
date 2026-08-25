import type { SidebarNavLayout } from '@laam/types';
import {
  BarChart3,
  CheckSquare,
  Folder,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import type {
  NavChildDefinition,
  UniversalNavGroup,
  UniversalNavItem,
} from '@/features/navigation/types/universal-nav';

export const CUSTOM_SECTION_PREFIX = 'section:';
export const CUSTOM_FOLDER_PREFIX = 'folder:';

export function isCustomSectionId(id: string): boolean {
  return id.startsWith(CUSTOM_SECTION_PREFIX);
}

export function isCustomFolderId(id: string): boolean {
  return id.startsWith(CUSTOM_FOLDER_PREFIX);
}

export function newCustomSectionId(): string {
  return `${CUSTOM_SECTION_PREFIX}${crypto.randomUUID()}`;
}

export function newCustomFolderId(): string {
  return `${CUSTOM_FOLDER_PREFIX}${crypto.randomUUID()}`;
}

type IndexedNode = {
  id: string;
  title: string;
  url?: string;
  permissions: UniversalNavItem['permissions'];
  badge?: number;
  icon?: LucideIcon;
  children?: NavChildDefinition[];
  /** Top-level registry item (can be a folder itself). */
  isTopLevel: boolean;
};

function walkChildren(
  nodes: NavChildDefinition[] | undefined,
  into: Map<string, IndexedNode>,
): void {
  if (!nodes?.length) return;
  for (const node of nodes) {
    into.set(node.id, {
      id: node.id,
      title: node.title,
      url: node.url,
      permissions: node.permissions,
      badge: node.badge,
      children: node.children,
      isTopLevel: false,
    });
    walkChildren(node.children, into);
  }
}

/** Flat index of every registry item + nested child by id. */
export function indexRegistryNodes(
  groups: UniversalNavGroup[],
): Map<string, IndexedNode> {
  const map = new Map<string, IndexedNode>();
  for (const group of groups) {
    for (const item of group.items) {
      map.set(item.id, {
        id: item.id,
        title: item.title,
        url: item.url,
        permissions: item.permissions,
        badge: item.badge,
        icon: item.icon,
        children: item.children,
        isTopLevel: true,
      });
      walkChildren(item.children, map);
    }
  }
  return map;
}

function pickId(
  index: Map<string, IndexedNode>,
  used: Set<string>,
  ...candidates: string[]
): string | undefined {
  for (const raw of candidates) {
    const options = [
      raw,
      `orders-status-${raw}`,
      `orders-${raw}`,
    ];
    for (const id of options) {
      if (index.has(id) && !used.has(id)) return id;
    }
  }
  return undefined;
}

function takeMany(
  index: Map<string, IndexedNode>,
  used: Set<string>,
  candidates: string[][],
): string[] {
  const out: string[] = [];
  for (const group of candidates) {
    const id = pickId(index, used, ...group);
    if (id) {
      used.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Registry ids for the All Orders queue leaf (`orders-all` after buildOrdersNav). */
const ALL_ORDERS_LEAF_IDS = new Set([
  'all',
  'orders-all',
  'order_dashboard',
  'confirmed_dashboard',
  'orders-order_dashboard',
  'orders-confirmed_dashboard',
]);

function isAllOrdersLeafId(id: string): boolean {
  return ALL_ORDERS_LEAF_IDS.has(id);
}

const ICON_BY_HINT: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ShoppingCart,
  courier: Truck,
  inventory: Package,
  people: Users,
  marketing: Megaphone,
  accounting: Wallet,
  finance: Wallet,
  reports: BarChart3,
  work: CheckSquare,
  settings: Settings,
  followup: CheckSquare,
};

/**
 * COO PDF default sidebar structure.
 * Child titles always come from the live registry / order-status config.
 */
export function buildDefaultSidebarNavLayout(
  groups: UniversalNavGroup[],
): SidebarNavLayout {
  const index = indexRegistryNodes(groups);
  const used = new Set<string>();

  const pendingChildren = takeMany(index, used, [
    ['create_new', 'create', 'create_order', 'new'],
    ['processing'],
    ['incomplete', 'incomplete_orders', 'pending_incomplete'],
    ['good_but_no_response', 'good-but-no-response'],
    ['no_response', 'no-response'],
    ['advanced_payment', 'advanced-payment'],
    ['hold', 'on_hold'],
    ['hold_followup'],
    ['pre_order', 'pre-order', 'preorder'],
    ['cancelled', 'canceled'],
  ]);

  // All Orders is its own top-level parent (below Dashboard), not under Confirmed.
  const allOrdersChildren = takeMany(index, used, [
    ['all', 'order_dashboard', 'confirmed_dashboard'],
  ]);

  const confirmedChildren = takeMany(index, used, [
    ['variation_1'],
    ['variation_2'],
    ['variation_3'],
  ]);

  const courierChildren = takeMany(index, used, [
    ['courier'],
    ['rts_pathao', 'rts-pathao'],
    ['rts_carrybee', 'rts-carrybee'],
    ['in_courier'],
    ['delivered'],
    ['partial_delivered', 'partial-delivered'],
    ['pending_return'],
    ['returned'],
  ]);

  // Prefer dedicated followups leaf; fall back to work folder children later.
  const followupChildren = takeMany(index, used, [['followups', 'activities']]);

  const customersChildren = takeMany(index, used, [['customers', 'customers-all']]);

  const sections = [
    { id: 'section:main', label: '' },
    { id: 'section:operations', label: 'Operations' },
    { id: 'section:growth', label: 'Growth' },
    { id: 'section:business', label: 'Business' },
    { id: 'section:administration', label: 'Administration' },
  ];

  const folders: SidebarNavLayout['folders'] = [
    {
      id: 'folder:dashboard',
      sectionId: 'section:main',
      label: 'Dashboard',
      iconFromId: 'dashboard',
    },
    {
      id: 'folder:all-orders',
      sectionId: 'section:main',
      label: 'All Orders',
      iconFromId: 'orders',
    },
    {
      id: 'folder:pending-orders',
      sectionId: 'section:operations',
      label: 'Pending Orders',
      iconFromId: 'orders',
    },
    {
      id: 'folder:confirmed-orders',
      sectionId: 'section:operations',
      label: 'Confirmed Orders',
      iconFromId: 'orders',
    },
    {
      id: 'folder:courier-delivery',
      sectionId: 'section:operations',
      label: 'Courier & Delivery',
      iconFromId: 'courier',
    },
    {
      id: 'folder:task-followup',
      sectionId: 'section:operations',
      label: 'Task & Followup',
      iconFromId: 'work',
    },
    {
      id: 'folder:inventory',
      sectionId: 'section:operations',
      label: 'Inventory',
      iconFromId: 'inventory',
    },
    {
      id: 'folder:people',
      sectionId: 'section:operations',
      label: 'People Management',
      iconFromId: 'people',
    },
    {
      id: 'folder:marketing',
      sectionId: 'section:growth',
      label: 'Marketing',
      iconFromId: 'marketing',
    },
    {
      id: 'folder:customers',
      sectionId: 'section:growth',
      label: 'Customers',
      iconFromId: 'people',
    },
    {
      id: 'folder:finance',
      sectionId: 'section:business',
      label: 'Finance',
      iconFromId: 'accounting',
    },
    {
      id: 'folder:hrm',
      sectionId: 'section:business',
      label: 'HRM & Payroll',
      iconFromId: 'incentive',
    },
    {
      id: 'folder:reports',
      sectionId: 'section:business',
      label: 'Reports',
      iconFromId: 'reports',
    },
    {
      id: 'folder:workspace',
      sectionId: 'section:business',
      label: 'Workspace',
      iconFromId: 'work',
    },
    {
      id: 'folder:settings',
      sectionId: 'section:administration',
      label: 'Settings',
      iconFromId: 'settings',
    },
    {
      id: 'folder:support',
      sectionId: 'section:administration',
      label: 'Support',
      iconFromId: 'support',
    },
  ];

  const childrenByFolderId: Record<string, string[]> = {
    'folder:dashboard': takeMany(index, used, [['dashboard']]),
    'folder:all-orders': allOrdersChildren,
    'folder:pending-orders': pendingChildren,
    'folder:confirmed-orders': confirmedChildren,
    'folder:courier-delivery': courierChildren,
    'folder:task-followup': followupChildren.length
      ? followupChildren
      : takeMany(index, used, [['tasks'], ['activities']]),
    'folder:inventory': takeMany(index, used, [['inventory']]),
    'folder:people': takeMany(index, used, [['leads'], ['contacts']]),
    'folder:marketing': (() => {
      const moduleId = takeMany(index, used, [['marketing']]);
      if (moduleId.length) return moduleId;
      return takeMany(index, used, [
        ['campaigns-active'],
        ['campaigns-budget'],
        ['campaigns-landing'],
        ['campaign-roi'],
        ['lead-sources'],
      ]);
    })(),
    'folder:customers': customersChildren.length
      ? customersChildren
      : takeMany(index, used, [['customers']]),
    'folder:finance': takeMany(index, used, [['accounting']]),
    'folder:hrm': takeMany(index, used, [['incentive']]),
    'folder:reports': takeMany(index, used, [['reports']]),
    'folder:workspace': takeMany(index, used, [
      ['tasks'],
      ['notifications'],
      ['calendar'],
      ['automations'],
      ['knowledge'],
      ['coupons'],
    ]),
    'folder:settings': takeMany(index, used, [['settings']]),
    'folder:support': takeMany(index, used, [['support']]),
  };

  // Unplaced registry nodes stay out of the live sidebar — Brand editor
  // "Available" pool lists them for drag-into-folder. Do not auto-append.

  return {
    version: 1,
    sections,
    folders,
    childrenByFolderId,
    hiddenIds: [],
  };
}

/**
 * If a parent module is placed (e.g. `customers`), drop its nested leaf ids
 * from the same folder so they don't render twice (nested + flat siblings).
 */
function collapseCoveredPlacedIds(
  placedIds: string[],
  index: Map<string, IndexedNode>,
): string[] {
  const placed = new Set(placedIds);
  const covered = new Set<string>();

  function markDescendants(nodeId: string) {
    const node = index.get(nodeId);
    if (!node?.children?.length) return;
    for (const child of node.children) {
      covered.add(child.id);
      markDescendants(child.id);
    }
  }

  for (const id of placedIds) {
    if (placed.has(id)) markDescendants(id);
  }

  return placedIds.filter((id) => !covered.has(id));
}

function resolveIcon(
  folder: SidebarNavLayout['folders'][number],
  index: Map<string, IndexedNode>,
): LucideIcon {
  if (folder.iconFromId) {
    const from = index.get(folder.iconFromId);
    if (from?.icon) return from.icon;
    const hint = folder.iconFromId.toLowerCase();
    for (const [key, icon] of Object.entries(ICON_BY_HINT)) {
      if (hint.includes(key)) return icon;
    }
  }
  const label = folder.label.toLowerCase();
  for (const [key, icon] of Object.entries(ICON_BY_HINT)) {
    if (label.includes(key)) return icon;
  }
  return Folder;
}

function toChild(
  node: IndexedNode,
  hidden: Set<string>,
): NavChildDefinition | null {
  if (hidden.has(node.id)) return null;
  if (node.url) {
    return {
      id: node.id,
      title: node.title,
      url: node.url,
      permissions: node.permissions,
      badge: node.badge,
      children: node.children
        ?.map((child) => {
          const indexed = {
            id: child.id,
            title: child.title,
            url: child.url,
            permissions: child.permissions,
            badge: child.badge,
            children: child.children,
            isTopLevel: false,
          } satisfies IndexedNode;
          return toChild(indexed, hidden);
        })
        .filter((child): child is NavChildDefinition => Boolean(child)),
    };
  }

  // Top-level module without own URL (e.g. inventory) — expand its children
  if (node.children?.length) {
    const kids = node.children
      .map((child) => {
        const indexed: IndexedNode = {
          id: child.id,
          title: child.title,
          url: child.url,
          permissions: child.permissions,
          badge: child.badge,
          children: child.children,
          isTopLevel: false,
        };
        return toChild(indexed, hidden);
      })
      .filter((child): child is NavChildDefinition => Boolean(child));
    // Represent as a single expandable child group by promoting children flat
    // when parent has no URL — return null and let caller flatten.
    void kids;
  }
  return null;
}

function expandPlacedNode(
  node: IndexedNode,
  hidden: Set<string>,
): NavChildDefinition[] {
  if (hidden.has(node.id)) return [];

  // Leaf with URL (keeps nested children — e.g. All Customers → 1x/2x/Loyal)
  if (node.url) {
    const child = toChild(node, hidden);
    return child ? [child] : [];
  }

  // Module folder (inventory, settings…) — surface its children under our custom folder
  if (node.children?.length) {
    return node.children.flatMap((child) => {
      const indexed: IndexedNode = {
        id: child.id,
        title: child.title,
        url: child.url,
        permissions: child.permissions,
        badge: child.badge,
        children: child.children,
        isTopLevel: false,
      };
      return expandPlacedNode(indexed, hidden);
    });
  }

  return [];
}

/**
 * Rebuild sidebar groups from an org layout.
 * Leaves keep registry urls / permissions / titles (except folder/section labels).
 */
export function applySidebarNavLayout(
  groups: UniversalNavGroup[],
  layout: SidebarNavLayout,
): UniversalNavGroup[] {
  const index = indexRegistryNodes(groups);
  const hidden = new Set(layout.hiddenIds ?? []);
  const locked = groups.filter((g) => g.id === 'platform');

  const result: UniversalNavGroup[] = [];

  for (const section of layout.sections) {
    const sectionFolders = layout.folders.filter(
      (folder) => folder.sectionId === section.id,
    );
    const items: UniversalNavItem[] = [];

    for (const folder of sectionFolders) {
      const rawPlaced = layout.childrenByFolderId[folder.id] ?? [];
      const placedIds = collapseCoveredPlacedIds(rawPlaced, index);
      const children: NavChildDefinition[] = [];

      // Special case: single dashboard leaf → top-level link item
      if (
        placedIds.length === 1 &&
        placedIds[0] === 'dashboard' &&
        folder.id === 'folder:dashboard'
      ) {
        const dash = index.get('dashboard');
        if (dash && !hidden.has('dashboard')) {
          items.push({
            id: folder.id,
            title: folder.label || dash.title,
            icon: dash.icon ?? LayoutDashboard,
            url: dash.url,
            permissions: dash.permissions,
            badge: dash.badge,
          });
          continue;
        }
      }

      // All Orders queue → top-level parent link (same pattern as Dashboard)
      if (folder.id === 'folder:all-orders') {
        const leafId =
          placedIds.length === 1 && isAllOrdersLeafId(placedIds[0]!)
            ? placedIds[0]!
            : placedIds.find((id) => isAllOrdersLeafId(id));
        const allOrders = leafId ? index.get(leafId) : undefined;
        if (allOrders?.url && !hidden.has(allOrders.id)) {
          items.push({
            id: folder.id,
            title: folder.label || 'All Orders',
            icon: resolveIcon(folder, index),
            url: allOrders.url,
            permissions: allOrders.permissions,
            badge: allOrders.badge,
          });
          continue;
        }
      }

      for (const childId of placedIds) {
        const node = index.get(childId);
        if (!node) continue;
        children.push(...expandPlacedNode(node, hidden));
      }

      // Deduplicate by id while preserving order
      const seen = new Set<string>();
      const uniqueChildren = children.filter((child) => {
        if (seen.has(child.id)) return false;
        seen.add(child.id);
        return true;
      });

      // If folder maps 1:1 to a registry module with URL and no children after expand
      if (!uniqueChildren.length) {
        const registryFolder = index.get(
          folder.iconFromId ?? folder.id.replace(/^folder:/, ''),
        );
        if (registryFolder?.url && !hidden.has(registryFolder.id)) {
          items.push({
            id: folder.id,
            title: folder.label,
            icon: resolveIcon(folder, index),
            url: registryFolder.url,
            permissions: registryFolder.permissions,
            badge: registryFolder.badge,
          });
          continue;
        }
      }

      if (!uniqueChildren.length) continue;

      const perms = [
        ...new Set(uniqueChildren.flatMap((child) => child.permissions)),
      ];
      const badgeSum = uniqueChildren.reduce(
        (sum, child) => sum + (child.badge ?? 0),
        0,
      );

      items.push({
        id: folder.id,
        title: folder.label,
        icon: resolveIcon(folder, index),
        permissions: perms.length ? perms : ['dashboard.view'],
        badge: badgeSum > 0 ? badgeSum : undefined,
        children: uniqueChildren,
      });
    }

    if (!items.length) continue;
    result.push({
      id: section.id,
      label: section.label,
      items,
    });
  }

  return [...result, ...locked];
}

/** Merge saved layout onto defaults. Unplaced items stay available for Brand drag. */
export function normalizeSidebarNavLayout(
  saved: SidebarNavLayout | null | undefined,
  defaults: SidebarNavLayout,
): SidebarNavLayout {
  if (!saved || saved.version !== 1 || !saved.sections?.length) {
    return defaults;
  }

  const childrenByFolderId: Record<string, string[]> = {};
  for (const [folderId, ids] of Object.entries(saved.childrenByFolderId ?? {})) {
    const list = ids ?? [];
    // Strip legacy flat purchase leaves when All Customers parent is present.
    if (list.includes('customers')) {
      childrenByFolderId[folderId] = list.filter(
        (id) => id === 'customers' || !id.startsWith('customers-'),
      );
    } else {
      childrenByFolderId[folderId] = list;
    }
  }

  // Migrate All Orders out of Confirmed (or elsewhere) into its own parent folder.
  let folders = [...(saved.folders ?? [])];
  const hasAllOrdersFolder = folders.some((f) => f.id === 'folder:all-orders');
  if (!hasAllOrdersFolder) {
    const defaultAll = defaults.folders.find((f) => f.id === 'folder:all-orders');
    const dashIdx = folders.findIndex((f) => f.id === 'folder:dashboard');
    const insertAt = dashIdx >= 0 ? dashIdx + 1 : 0;
    folders = [
      ...folders.slice(0, insertAt),
      defaultAll ?? {
        id: 'folder:all-orders',
        sectionId: 'section:main',
        label: 'All Orders',
        iconFromId: 'orders',
      },
      ...folders.slice(insertAt),
    ];
  }

  let migratedAllId: string | null = null;
  for (const [folderId, ids] of Object.entries(childrenByFolderId)) {
    if (folderId === 'folder:all-orders') continue;
    const hit = ids.find((id) => ALL_ORDERS_LEAF_IDS.has(id));
    if (!hit) continue;
    migratedAllId = hit;
    childrenByFolderId[folderId] = ids.filter((id) => !ALL_ORDERS_LEAF_IDS.has(id));
  }
  const existingAll = (childrenByFolderId['folder:all-orders'] ?? []).filter(
    (id) => ALL_ORDERS_LEAF_IDS.has(id),
  );
  if (migratedAllId || existingAll.length || defaults.childrenByFolderId['folder:all-orders']?.length) {
    childrenByFolderId['folder:all-orders'] = existingAll.length
      ? existingAll
      : migratedAllId
        ? [migratedAllId]
        : [...(defaults.childrenByFolderId['folder:all-orders'] ?? ['all'])];
  }

  return {
    version: 1,
    sections: saved.sections,
    folders,
    childrenByFolderId,
    hiddenIds: [...new Set(saved.hiddenIds ?? [])],
  };
}

/** Virtual folder id used by Brand editor Available pool (not persisted). */
export const AVAILABLE_POOL_ID = '__available__';

/**
 * Placeable registry ids not currently assigned to any sidebar folder.
 * Children expanded via a placed parent module are treated as placed.
 */
export function listUnplacedRegistryIds(
  groups: UniversalNavGroup[],
  layout: SidebarNavLayout,
): string[] {
  const index = indexRegistryNodes(groups);
  const placed = new Set<string>();
  for (const ids of Object.values(layout.childrenByFolderId ?? {})) {
    for (const id of ids) placed.add(id);
  }

  const covered = new Set<string>();
  function markCovered(nodeId: string) {
    if (covered.has(nodeId)) return;
    covered.add(nodeId);
    const node = index.get(nodeId);
    if (!node?.children?.length) return;
    for (const child of node.children) markCovered(child.id);
  }
  for (const id of placed) markCovered(id);

  const out: string[] = [];
  for (const [id, node] of index) {
    if (covered.has(id)) continue;
    if (!node.url && !node.children?.length) continue;
    // Skip empty section-only noise
    out.push(id);
  }

  return out.sort((a, b) => {
    const aOrders = a.startsWith('orders-') ? 0 : 1;
    const bOrders = b.startsWith('orders-') ? 0 : 1;
    if (aOrders !== bOrders) return aOrders - bOrders;
    const ta = index.get(a)?.title ?? a;
    const tb = index.get(b)?.title ?? b;
    return ta.localeCompare(tb);
  });
}
