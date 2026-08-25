import type { SidebarNavLayout, SidebarNavOrder } from '@laam/types';

export const SIDEBAR_NAV_ORDER_CHANGED = 'laam:sidebar-nav-order-changed';
export const SIDEBAR_NAV_LAYOUT_CHANGED = 'laam:sidebar-nav-layout-changed';

let liveOrder: SidebarNavOrder | null = null;
let liveLayout: SidebarNavLayout | null = null;

export function getLiveSidebarNavOrder(): SidebarNavOrder | null {
  return liveOrder;
}

export function setLiveSidebarNavOrder(order: SidebarNavOrder | null): void {
  liveOrder = order;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SIDEBAR_NAV_ORDER_CHANGED));
  }
}

export function getLiveSidebarNavLayout(): SidebarNavLayout | null {
  return liveLayout;
}

export function setLiveSidebarNavLayout(layout: SidebarNavLayout | null): void {
  liveLayout = layout;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SIDEBAR_NAV_LAYOUT_CHANGED));
  }
}
