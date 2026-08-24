'use client';

import * as React from 'react';
import type { OrderListQuery, OrderListRowResponse } from '@laam/types';

import { ordersApi } from '@/features/orders/api/orders-api';
import { orderListCache } from '@/features/orders/data/order-query-cache';

export type OrderRowsListQuery = OrderListQuery;

export function useOrderRowsList(query: OrderRowsListQuery, version = 0) {
  const [data, setData] = React.useState<OrderListRowResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const queryKey = JSON.stringify(query);
  const queryRef = React.useRef(query);
  queryRef.current = query;

  const fetchRows = React.useCallback(async (key: string, force: boolean) => {
    if (!force) {
      const cached = orderListCache.get(key);
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
    // Only bypass cache when Refresh bumps version — not on every filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, fetchRows]);

  const refresh = React.useCallback(async () => {
    await fetchRows(queryKey, true);
  }, [fetchRows, queryKey]);

  return { data, isLoading, error, refresh };
}
