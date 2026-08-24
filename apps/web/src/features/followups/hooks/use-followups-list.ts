'use client';

import type { FollowupListQuery } from '@laam/types';

import { followupsApi } from '@/features/followups/api/followups-api';
import { followupListCache } from '@/features/followups/data/followup-query-cache';
import { useTtlList } from '@/lib/use-ttl-list';

export function useFollowupsList(query: FollowupListQuery, listVersion = 0) {
  return useTtlList({
    query,
    version: listVersion,
    cache: followupListCache,
    fetcher: (q) => followupsApi.listFollowups(q),
    errorMessage: 'Failed to load follow-ups.',
  });
}
