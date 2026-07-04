'use client';

import * as React from 'react';
import type { OrderDetail } from '@laam/types';

import { ordersApi } from '@/features/orders/api/orders-api';

export function useOrderDetail(orderNumber: string) {
  const [data, setData] = React.useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void ordersApi.getOrder(orderNumber).then(
      (response) => {
        if (!cancelled) {
          setData(response);
          setIsLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load order.');
          setIsLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  return { data, isLoading, error };
}
