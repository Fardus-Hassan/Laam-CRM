import type { SidebarNavOrder } from '@laam/types';

export const SIDEBAR_NAV_ORDER_CHANGED = 'laam:sidebar-nav-order-changed';

let liveOrder: SidebarNavOrder | null = null;

export function getLiveSidebarNavOrder(): SidebarNavOrder | null {
  return liveOrder;
}

export function setLiveSidebarNavOrder(order: SidebarNavOrder | null): void {
  liveOrder = order;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SIDEBAR_NAV_ORDER_CHANGED));
  }
}
