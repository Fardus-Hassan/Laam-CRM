import type { OrderNavStatusCounts, OrderStatusType } from '@laam/types';

import { getFollowUpDueCount } from '@/features/orders/data/mock-orders';
import { mockFailedOrderStore } from '@/features/orders/data/mock-failed-orders';

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

let liveCounts: OrderNavStatusCounts | null = null;

export const ORDER_STATUS_COUNTS_CHANGED = 'laam:order-status-counts-changed';

export function getLiveOrderNavCounts(): OrderNavStatusCounts | null {
  return liveCounts;
}

export function setLiveOrderNavCounts(counts: OrderNavStatusCounts): void {
  liveCounts = counts;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ORDER_STATUS_COUNTS_CHANGED));
  }
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
