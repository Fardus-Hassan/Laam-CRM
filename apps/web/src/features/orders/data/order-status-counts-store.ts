import type { OrderNavStatusCounts, OrderStatusType } from '@laam/types';

import { getFollowUpDueCount } from '@/features/orders/data/mock-orders';
import { mockFailedOrderStore } from '@/features/orders/data/mock-failed-orders';

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

let liveCounts: OrderNavStatusCounts | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export const ORDER_STATUS_COUNTS_CHANGED = 'laam:order-status-counts-changed';
/** Ask navigation to re-fetch sidebar order counts from the API. */
export const ORDER_NAV_COUNTS_REFRESH = 'laam:order-nav-counts-refresh';

export function getLiveOrderNavCounts(): OrderNavStatusCounts | null {
  return liveCounts;
}

export function setLiveOrderNavCounts(counts: OrderNavStatusCounts): void {
  liveCounts = counts;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ORDER_STATUS_COUNTS_CHANGED));
  }
}

/**
 * Debounced refresh of sidebar order badges after mutations
 * (status change, create, delete, bulk actions, failed-order queue).
 */
export function requestOrderNavCountsRefresh(delayMs = 350): void {
  if (typeof window === 'undefined') return;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    window.dispatchEvent(new Event(ORDER_NAV_COUNTS_REFRESH));
  }, delayMs);
}

/** Live API counts when hydrated; otherwise 0 in API mode (no fake demo badges). */
export function getStatusCount(slug: OrderStatusType | string): number {
  if (liveCounts) {
    return liveCounts.byStatus[slug] ?? 0;
  }
  return 0;
}

export function getFollowupsDueBadgeCount(): number {
  if (liveCounts) return liveCounts.followupsDue;
  if (!useHttpApi) return getFollowUpDueCount();
  return 0;
}

export function getFailedOrdersBadgeCount(): number {
  if (liveCounts) return liveCounts.failed;
  if (!useHttpApi) return mockFailedOrderStore.length;
  return 0;
}
