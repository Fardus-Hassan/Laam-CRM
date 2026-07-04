'use client';

import * as React from 'react';
import type { LeadPipelineQuery, LeadPipelineStats } from '@laam/types';

import { leadsApi } from '@/features/leads/api/leads-api';

export function useLeadPipeline(query: LeadPipelineQuery = {}, refreshKey = 0) {
  const [stats, setStats] = React.useState<LeadPipelineStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const queryKey = JSON.stringify(query);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void leadsApi.getPipelineStats(query).then(
      (response) => {
        if (!cancelled) {
          setStats(response);
          setIsLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load pipeline.');
          setIsLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [queryKey, refreshKey]);

  return {
    stats,
    isLoading,
    error,
    refresh: () => leadsApi.getPipelineStats(query).then(setStats),
  };
}
