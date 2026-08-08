import type { OrderStatusCount } from '@laam/types';

import {
  getLiveOrderNavCounts,
  getStatusCount as getLiveStatusCount,
} from '@/features/orders/data/order-status-counts-store';
import { getOrderStatuses } from '@/features/orders/data/order-status-store';

/** Demo counts for offline mock / group-by tiles before live hydrate. */
export const MOCK_STATUS_COUNTS: OrderStatusCount[] = [
  { slug: 'pending', count: 491, unitCount: 502 },
  { slug: 'pending_2', count: 736, unitCount: 741 },
  { slug: 'pending_3', count: 89, unitCount: 91 },
  { slug: 'confirmed', count: 118, unitCount: 120 },
  { slug: 'confirmed_2', count: 84, unitCount: 84 },
  { slug: 'hold', count: 340, unitCount: 345 },
  { slug: 'hold_followup', count: 205, unitCount: 208 },
  { slug: 'processing', count: 35, unitCount: 36 },
  { slug: 'in_courier', count: 1388, unitCount: 1402 },
  { slug: 'delivered', count: 3140, unitCount: 3180 },
  { slug: 'completed', count: 19687, unitCount: 19720 },
  { slug: 'cancelled', count: 7, unitCount: 7 },
  { slug: 'pending_return', count: 1851, unitCount: 1860 },
  { slug: 'returned', count: 420, unitCount: 425 },
  { slug: 'hand_delivery', count: 156, unitCount: 158 },
  { slug: 'hand_delivery_completed', count: 4335, unitCount: 4340 },
  { slug: 'special', count: 21, unitCount: 22 },
  { slug: 'convert', count: 64, unitCount: 65 },
  { slug: 'return_collection', count: 88, unitCount: 90 },
  { slug: 'others', count: 1428, unitCount: 1435 },
];

const countMap = new Map<string, OrderStatusCount>(
  MOCK_STATUS_COUNTS.map((item) => [item.slug, item]),
);

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export function getStatusCount(slug: string): number {
  if (useHttpApi) {
    return getLiveStatusCount(slug);
  }
  return countMap.get(slug)?.count ?? 0;
}

export function getStatusUnitCount(slug: string): number {
  if (useHttpApi) {
    return getLiveStatusCount(slug);
  }
  return countMap.get(slug)?.unitCount ?? getStatusCount(slug);
}

export function getTotalOrderCount(): number {
  if (useHttpApi) {
    const live = getLiveOrderNavCounts();
    if (live) {
      return Object.values(live.byStatus).reduce((sum, count) => sum + count, 0);
    }
    return getOrderStatuses().reduce((sum, item) => sum + getLiveStatusCount(item.slug), 0);
  }
  return MOCK_STATUS_COUNTS.reduce((sum, item) => sum + item.count, 0);
}

export function getReturnRatio(): { percent: number; count: number } {
  const pendingReturn = getStatusCount('pending_return');
  const total = getTotalOrderCount();
  return {
    count: pendingReturn,
    percent: total > 0 ? (pendingReturn / total) * 100 : 0,
  };
}

export function getStatusCountsForGroupBy(): Array<{
  config: ReturnType<typeof getOrderStatuses>[number];
  count: number;
  unitCount: number;
  percent: number;
}> {
  const total = getTotalOrderCount();

  return getOrderStatuses()
    .filter((item) => item.showInGroupByStatus !== false)
    .map((config) => {
      const count = getStatusCount(config.slug);
      const unitCount = getStatusUnitCount(config.slug);
      return {
        config,
        count,
        unitCount,
        percent: total > 0 ? (count / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}
