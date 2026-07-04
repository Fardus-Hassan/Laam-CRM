'use client';

import * as React from 'react';
import type { FollowupListQuery, FollowupListResponse } from '@laam/types';

import { followupsApi } from '@/features/followups/api/followups-api';

export function useFollowupsList(query: FollowupListQuery, listVersion = 0) {
  const [data, setData] = React.useState<FollowupListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const queryKey = JSON.stringify(query);

  const fetchList = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await followupsApi.listFollowups(query);
      setData(response);
    } catch {
      setError('Failed to load follow-ups.');
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);

  React.useEffect(() => {
    void fetchList();
  }, [fetchList, listVersion]);

  return { data, isLoading, error, refresh: fetchList };
}
