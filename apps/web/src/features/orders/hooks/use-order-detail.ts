'use client';

import * as React from 'react';
import type { OrderDetail } from '@laam/types';

import { ordersApi } from '@/features/orders/api/orders-api';
import { orderDetailCache } from '@/features/orders/data/order-query-cache';
import { ORDERS_REALTIME_CHANGED } from '@/features/orders/data/order-realtime-store';
import type { OrderRealtimePayload } from '@/features/orders/lib/order-realtime-stream';
import { usePageDataRefresh } from '@/lib/page-data-refresh';

export function useOrderDetail(orderNumber: string) {
  const [data, setData] = React.useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState(0);

  usePageDataRefresh(() => setVersion((v) => v + 1));

  React.useEffect(() => {
    function onRealtime(event: Event) {
      const detail = (event as CustomEvent<OrderRealtimePayload>).detail;
      if (detail?.orderId && data?.id && detail.orderId !== data.id) return;
      setVersion((v) => v + 1);
    }
    window.addEventListener(ORDERS_REALTIME_CHANGED, onRealtime);
    return () => window.removeEventListener(ORDERS_REALTIME_CHANGED, onRealtime);
  }, [data?.id]);

  const fetchDetail = React.useCallback(async (id: string, force: boolean) => {
    if (!id) {
      setData(null);
      setIsLoading(false);
      return;
    }

    if (!force) {
      const cached = orderDetailCache.get(id);
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
      const response = await ordersApi.getOrder(id);
      if (!response) {
        setData(null);
        setError('Failed to load order.');
        return;
      }
      orderDetailCache.set(id, response);
      setData(response);
    } catch {
      setError('Failed to load order.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchDetail(orderNumber, false);
  }, [orderNumber, fetchDetail]);

  React.useEffect(() => {
    if (version === 0) return;
    void fetchDetail(orderNumber, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, fetchDetail]);

  return { data, isLoading, error };
}
