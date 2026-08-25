import type { CustomerListResponse } from '@laam/types';

import { createTtlCache } from '@/lib/ttl-cache';

export const customerListCache = createTtlCache<CustomerListResponse>({
  ttlMs: 60_000,
  maxEntries: 40,
  keyPrefix: 'customers-list',
});

export function invalidateCustomerQueryCaches(): void {
  customerListCache.invalidate();
}
