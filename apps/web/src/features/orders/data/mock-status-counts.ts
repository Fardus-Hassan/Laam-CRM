import type { OrderStatusCount, OrderStatusType } from '@laam/types';

import { MOCK_ORDER_STATUSES } from '@/features/orders/data/mock-status-config';

/** Demo counts for sidebar badges and Group by Status tiles. */
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

const countMap = new Map<OrderStatusType, OrderStatusCount>(
  MOCK_STATUS_COUNTS.map((item) => [item.slug, item]),
);

export function getStatusCount(slug: OrderStatusType): number {
  return countMap.get(slug)?.count ?? 0;
}

export function getStatusUnitCount(slug: OrderStatusType): number {
  return countMap.get(slug)?.unitCount ?? getStatusCount(slug);
}

export function getTotalOrderCount(): number {
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
  config: (typeof MOCK_ORDER_STATUSES)[number];
  count: number;
  unitCount: number;
  percent: number;
}> {
  const total = getTotalOrderCount();

  return MOCK_ORDER_STATUSES.filter((item) => item.showInGroupByStatus)
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
