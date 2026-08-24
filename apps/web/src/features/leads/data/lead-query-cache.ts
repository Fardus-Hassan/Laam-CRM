import type { LeadListResponse } from '@laam/types';

import { createTtlCache } from '@/lib/ttl-cache';

export const leadListCache = createTtlCache<LeadListResponse>({
  ttlMs: 60_000,
  maxEntries: 40,
  keyPrefix: 'leads-list',
});

export function invalidateLeadQueryCaches(): void {
  leadListCache.invalidate();
}
