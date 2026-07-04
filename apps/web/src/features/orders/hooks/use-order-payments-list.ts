'use client';

import * as React from 'react';
import type { OrderPaymentListQuery } from '@laam/types';

import { orderPaymentsApi } from '@/features/orders/api/order-payments-api';
import type { OrderPaymentListResponse } from '@laam/types';

export function useOrderPaymentsList(query: OrderPaymentListQuery) {
  const [data, setData] = React.useState<OrderPaymentListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const queryKey = JSON.stringify(query);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await orderPaymentsApi.listPayments(query);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
