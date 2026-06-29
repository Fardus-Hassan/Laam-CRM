'use client';

import * as React from 'react';
import type { LeadListQuery, LeadListResponse } from '@laam/types';

import { leadsApi } from '@/features/leads/api/leads-api';

export function useLeadsList(query: LeadListQuery) {
  const [data, setData] = React.useState<LeadListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const queryKey = JSON.stringify(query);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void leadsApi.listLeads(query).then(
      (response) => {
        if (!cancelled) {
          setData(response);
          setIsLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load leads.');
          setIsLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  return { data, isLoading, error, refresh: () => leadsApi.listLeads(query).then(setData) };
}
