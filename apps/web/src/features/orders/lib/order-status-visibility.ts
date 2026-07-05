import type { OrderStatusConfig } from '@laam/types';

export function statusShowsInSidebar(status: OrderStatusConfig): boolean {
  if (status.showInSidebar != null) {
    return status.showInSidebar;
  }

  return status.displayMode === 'sidebar' || status.displayMode === 'sidebar_and_tab';
}

export function statusShowsInNestedTabs(status: OrderStatusConfig): boolean {
  if (status.showInNestedTabs != null) {
    return status.showInNestedTabs;
  }

  return status.displayMode === 'nested_tab' || status.displayMode === 'sidebar_and_tab';
}

export function statusVisibilityLabel(status: OrderStatusConfig): string {
  const sidebar = statusShowsInSidebar(status);
  const tabs = statusShowsInNestedTabs(status);

  if (sidebar && tabs) return 'Sidebar + page tabs';
  if (sidebar) return 'Sidebar only';
  if (tabs) return 'Page tabs only';
  return 'Filter only';
}
