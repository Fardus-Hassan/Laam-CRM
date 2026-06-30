'use client';

import * as React from 'react';
import type { OrderListQuery, OrderListRowResponse } from '@laam/types';

import { ordersApi } from '@/features/orders/api/orders-api';

export type OrderRowsListQuery = OrderListQuery;

export function useOrderRowsList(query: OrderRowsListQuery) {
  const [data, setData] = React.useState<OrderListRowResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const queryKey = JSON.stringify(query);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void ordersApi.listOrderRows(query).then(
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

  return { data, isLoading, error };
}
