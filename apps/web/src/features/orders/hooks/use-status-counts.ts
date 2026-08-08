'use client';

import * as React from 'react';

import type { OrderStatusCount, OrderStatusType } from '@laam/types';

import {
  getReturnRatio,
  getStatusCount,
  getTotalOrderCount,
} from '@/features/orders/data/mock-status-counts';
import { getOrderStore } from '@/features/orders/data/mock-orders';
import {
  ORDER_STATUS_COUNTS_CHANGED,
} from '@/features/orders/data/order-status-counts-store';
import { getOrderStatuses } from '@/features/orders/data/order-status-store';

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

function buildCountsFromMockStore() {
  const store = getOrderStore();
  const byStatus = new Map<string, number>();
  for (const order of store) {
    byStatus.set(order.status, (byStatus.get(order.status) ?? 0) + 1);
  }

  const counts: OrderStatusCount[] = [...byStatus.entries()].map(([slug, count]) => ({
    slug: slug as OrderStatusType,
    count,
    unitCount: count,
  }));

  const total = store.length;
  const pendingReturn = byStatus.get('pending_return') ?? 0;
  const returnRatio = {
    count: pendingReturn,
    percent: total > 0 ? (pendingReturn / total) * 100 : 0,
  };

  return {
    counts,
    total,
    returnRatio,
    getCount: (status: string) => byStatus.get(status) ?? 0,
  };
}

function buildCountsFromLiveApi() {
  const total = getTotalOrderCount();
  const returnRatio = getReturnRatio();
  const counts: OrderStatusCount[] = getOrderStatuses().map((status) => {
    const count = getStatusCount(status.slug);
    return {
      slug: status.slug as OrderStatusType,
      count,
      unitCount: count,
    };
  });

  return {
    counts,
    total,
    returnRatio,
    getCount: (status: string) => getStatusCount(status),
  };
}

/** Live API status totals when hydrated; mock store only in offline demo mode. */
export function useStatusCounts() {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (useHttpApi) {
      function refresh() {
        setTick((t) => t + 1);
      }
      window.addEventListener(ORDER_STATUS_COUNTS_CHANGED, refresh);
      return () => window.removeEventListener(ORDER_STATUS_COUNTS_CHANGED, refresh);
    }

    const id = window.setInterval(() => setTick((t) => t + 1), 3000);
    return () => window.clearInterval(id);
  }, []);

  return React.useMemo(() => {
    const data = useHttpApi ? buildCountsFromLiveApi() : buildCountsFromMockStore();
    return { ...data, isLoading: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
}
