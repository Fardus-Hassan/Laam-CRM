'use client';

import * as React from 'react';

import type { OrderStatusCount, OrderStatusType } from '@laam/types';

import { getOrderStore } from '@/features/orders/data/mock-orders';

function buildCountsFromStore() {
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

export function useStatusCounts() {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 3000);
    return () => window.clearInterval(id);
  }, []);

  return React.useMemo(() => {
    const data = buildCountsFromStore();
    return { ...data, isLoading: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
}
