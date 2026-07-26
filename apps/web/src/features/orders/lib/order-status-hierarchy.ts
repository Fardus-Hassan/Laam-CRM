import type { OrderStatusConfig, OrderStatusDisplayMode } from '@laam/types';

import { MOCK_ORDER_QUEUE_PAGES } from '@/features/orders/data/mock-status-config';
import { getOrderStatuses } from '@/features/orders/data/order-status-store';
import {
  statusShowsInNestedTabs,
  statusShowsInSidebar,
} from '@/features/orders/lib/order-status-visibility';

/** Structural queue folders that can own nested statuses (not themselves statuses). */
export const STATUS_QUEUE_FOLDER_SLUGS = new Set(
  MOCK_ORDER_QUEUE_PAGES.filter(
    (page) => page.kind === 'list' && page.slug !== 'all' && page.slug !== 'more_statuses',
  ).map((page) => page.slug),
);

export function resolveDisplayModeFromFlags(
  showInSidebar: boolean,
  showInNestedTabs: boolean,
): OrderStatusDisplayMode {
  if (showInSidebar && showInNestedTabs) return 'sidebar_and_tab';
  if (showInSidebar) return 'sidebar';
  if (showInNestedTabs) return 'nested_tab';
  return 'filter_only';
}

export function wouldCreateParentCycle(
  statuses: OrderStatusConfig[],
  childSlug: string,
  parentSlug: string | undefined,
): boolean {
  if (!parentSlug) return false;
  if (parentSlug === childSlug) return true;

  const bySlug = new Map(statuses.map((s) => [s.slug, s]));
  let cursor: string | undefined = parentSlug;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === childSlug) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = bySlug.get(cursor)?.parentSlug;
  }
  return false;
}

export type StatusParentOption = {
  value: string;
  label: string;
  kind: 'queue' | 'status';
};

/** Parent = queue folder OR another status (cycle-safe). */
export function getStatusParentOptions(excludeSlug?: string): StatusParentOption[] {
  const statuses = getOrderStatuses();
  const queues = MOCK_ORDER_QUEUE_PAGES.filter((page) =>
    STATUS_QUEUE_FOLDER_SLUGS.has(page.slug),
  ).map((page) => ({
    value: page.slug,
    label: `${page.label} (queue)`,
    kind: 'queue' as const,
  }));

  const statusParents = statuses
    .filter((status) => status.slug !== excludeSlug)
    .filter((status) => !wouldCreateParentCycle(statuses, excludeSlug ?? '', status.slug))
    .map((status) => ({
      value: status.slug,
      label: `${status.label} (status)`,
      kind: 'status' as const,
    }));

  return [...queues, ...statusParents];
}

/** Dropdown options: configured statuses (seed + local overrides). */
export function getOrderStatusSelectOptions(): Array<{ value: string; label: string }> {
  return getOrderStatuses().map((status) => ({
    value: status.slug,
    label: status.label,
  }));
}

export function mergeStatusSelectOptions(
  base: Array<{ value: string; label: string }>,
): Array<{ value: string; label: string }> {
  const map = new Map(base.map((item) => [item.value, item]));
  for (const status of getOrderStatuses()) {
    if (!map.has(status.slug)) {
      map.set(status.slug, { value: status.slug, label: status.label });
    } else {
      // Prefer configured label from status store
      map.set(status.slug, { value: status.slug, label: status.label });
    }
  }
  return [...map.values()];
}

export function getSidebarChildStatuses(parentSlug: string): OrderStatusConfig[] {
  return getOrderStatuses()
    .filter((status) => status.parentSlug === parentSlug && statusShowsInSidebar(status))
    .sort((a, b) => (a.sidebarOrder ?? 99) - (b.sidebarOrder ?? 99));
}

export function getNestedTabChildStatuses(parentSlug: string): OrderStatusConfig[] {
  return getOrderStatuses()
    .filter((status) => status.parentSlug === parentSlug && statusShowsInNestedTabs(status))
    .sort((a, b) => (a.sidebarOrder ?? 99) - (b.sidebarOrder ?? 99));
}
