'use client';

import * as React from 'react';
import type { OrderListQuery, OrderListResponse } from '@laam/types';

import { ordersApi } from '@/features/orders/api/orders-api';

export function useOrdersList(query: OrderListQuery) {
  const [data, setData] = React.useState<OrderListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const queryKey = JSON.stringify(query);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void ordersApi.listOrders(query).then(
      (response) => {
        if (!cancelled) {
          setData(response);
          setIsLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load orders.');
          setIsLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  return { data, isLoading, error, refresh: () => ordersApi.listOrders(query).then(setData) };
}
