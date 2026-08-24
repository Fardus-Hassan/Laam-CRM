'use client';

import type { LeadListQuery } from '@laam/types';

import { leadsApi } from '@/features/leads/api/leads-api';
import { leadListCache } from '@/features/leads/data/lead-query-cache';
import { useTtlList } from '@/lib/use-ttl-list';

export function useLeadsList(query: LeadListQuery, listVersion = 0) {
  return useTtlList({
    query,
    version: listVersion,
    cache: leadListCache,
    fetcher: (q) => leadsApi.listLeads(q),
    errorMessage: 'Failed to load leads.',
  });
}
