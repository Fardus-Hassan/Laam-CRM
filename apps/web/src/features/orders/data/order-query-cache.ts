import type { OrderDetail, OrderListRowResponse } from '@laam/types';

import { createTtlCache } from '@/lib/ttl-cache';

/** Soft cache for order list queues — ~1 min (SaaS list navigation default). */
export const orderListCache = createTtlCache<OrderListRowResponse>({
  ttlMs: 60_000,
  maxEntries: 40,
  keyPrefix: 'orders-list',
});

/** Soft cache for order detail — shorter TTL (status changes matter). */
export const orderDetailCache = createTtlCache<OrderDetail>({
  ttlMs: 30_000,
  maxEntries: 24,
  keyPrefix: 'orders-detail',
});

/** Call after create / status / bulk / note mutations so lists stay honest. */
export function invalidateOrderQueryCaches(): void {
  orderListCache.invalidate();
  orderDetailCache.invalidate();
}
