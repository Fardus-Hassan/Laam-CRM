'use client';

import * as React from 'react';

import type { createTtlCache } from '@/lib/ttl-cache';

type TtlCache<T> = ReturnType<typeof createTtlCache<T>>;

/**
 * List/detail fetch with in-memory TTL cache.
 * - First visit stores the response until TTL.
 * - Same query within TTL does not hit the API.
 * - `version > 0` (top-bar Refresh / mutation bump) bypasses cache.
 */
export function useTtlList<TQuery, TData>(options: {
  query: TQuery;
  version?: number;
  cache: TtlCache<TData>;
  fetcher: (query: TQuery) => Promise<TData>;
  errorMessage: string;
}) {
  const { query, version = 0, cache, fetcher, errorMessage } = options;
  const [data, setData] = React.useState<TData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const queryKey = JSON.stringify(query);
  const queryRef = React.useRef(query);
  queryRef.current = query;
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = React.useCallback(
    async (key: string, force: boolean) => {
      if (!force) {
        const cached = cache.get(key);
        if (cached) {
          setData(cached);
          setIsLoading(false);
          setError(null);
          return;
        }
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetcherRef.current(queryRef.current);
        cache.set(key, response);
        setData(response);
      } catch {
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [cache, errorMessage],
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cached = cache.get(queryKey);
      if (cached) {
        if (!cancelled) {
          setData(cached);
          setIsLoading(false);
          setError(null);
        }
        return;
      }
      if (!cancelled) {
        await load(queryKey, true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryKey, cache, load]);

  React.useEffect(() => {
    if (version === 0) return;
    void load(queryKey, true);
    // Bypass only when Refresh / mutation bumps version — not on every filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, load]);

  const refresh = React.useCallback(async () => {
    await load(queryKey, true);
  }, [load, queryKey]);

  return { data, isLoading, error, refresh };
}
