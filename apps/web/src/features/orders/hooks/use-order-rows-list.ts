'use client';

import * as React from 'react';
import type { OrderListQuery, OrderListRowResponse } from '@laam/types';

import { ordersApi } from '@/features/orders/api/orders-api';
import { orderListCache } from '@/features/orders/data/order-query-cache';

export type OrderRowsListQuery = OrderListQuery;

/**
 * Order list fetch with TTL cache.
 * Realtime / refresh bumps `version` and refetch without blanking the table
 * when rows are already on screen (soft refresh — no skeleton flash).
 */
export function useOrderRowsList(query: OrderRowsListQuery, version = 0) {
  const [data, setData] = React.useState<OrderListRowResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const dataRef = React.useRef<OrderListRowResponse | null>(null);
  dataRef.current = data;

  const queryKey = JSON.stringify(query);
  const queryRef = React.useRef(query);
  queryRef.current = query;
  const activeKeyRef = React.useRef(queryKey);

  const fetchRows = React.useCallback(async (key: string, force: boolean) => {
    if (!force) {
      const cached = orderListCache.get(key);
      if (cached) {
        setData(cached);
        setIsLoading(false);
        setError(null);
        activeKeyRef.current = key;
        return;
      }
    }

    // Soft refresh only when re-fetching the *same* query (realtime / top-bar).
    // Filter/page changes keep a real loading state so we don't flash stale rows.
    const soft = force && dataRef.current != null && activeKeyRef.current === key;
    activeKeyRef.current = key;
    if (!soft) setIsLoading(true);
    setError(null);
    try {
      const response = await ordersApi.listOrderRows(queryRef.current);
      orderListCache.set(key, response);
      setData(response);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cached = orderListCache.get(queryKey);
      if (cached) {
        if (!cancelled) {
          setData(cached);
          setIsLoading(false);
          setError(null);
        }
        return;
      }
      if (!cancelled) {
        await fetchRows(queryKey, true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryKey, fetchRows]);

  React.useEffect(() => {
    if (version === 0) return;
    void fetchRows(queryKey, true);
    // Only bypass cache when Refresh / realtime bumps version — not on every filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, fetchRows]);

  const refresh = React.useCallback(async () => {
    await fetchRows(queryKey, true);
  }, [fetchRows, queryKey]);

  return { data, isLoading, error, refresh };
}
