import type { ContactListResponse } from '@laam/types';

import { createTtlCache } from '@/lib/ttl-cache';

export const contactListCache = createTtlCache<ContactListResponse>({
  ttlMs: 60_000,
  maxEntries: 40,
  keyPrefix: 'contacts-list',
});

export function invalidateContactQueryCaches(): void {
  contactListCache.invalidate();
}
