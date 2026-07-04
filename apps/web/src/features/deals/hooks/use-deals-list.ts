'use client';

import * as React from 'react';
import type { DealListQuery, DealListResponse } from '@laam/types';

import { dealsApi } from '@/features/deals/api/deals-api';

export function useDealsList(query: DealListQuery) {
  const [data, setData] = React.useState<DealListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const queryKey = JSON.stringify(query);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void dealsApi.listDeals(query).then(
      (response) => {
        if (!cancelled) {
          setData(response);
          setIsLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load deals.');
          setIsLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  return { data, isLoading, error };
}
