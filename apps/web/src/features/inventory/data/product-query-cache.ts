import type { ProductListResponse } from '@laam/types';

import { createTtlCache } from '@/lib/ttl-cache';

export const productListCache = createTtlCache<ProductListResponse>({
  ttlMs: 60_000,
  maxEntries: 40,
  keyPrefix: 'products-list',
});

export function invalidateProductQueryCaches(): void {
  productListCache.invalidate();
}
