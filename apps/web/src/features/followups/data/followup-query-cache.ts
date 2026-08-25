import type { FollowupListResponse } from '@laam/types';

import { createTtlCache } from '@/lib/ttl-cache';

export const followupListCache = createTtlCache<FollowupListResponse>({
  ttlMs: 60_000,
  maxEntries: 40,
  keyPrefix: 'followups-list',
});

export function invalidateFollowupQueryCaches(): void {
  followupListCache.invalidate();
}
