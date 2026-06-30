'use client';

import * as React from 'react';

import type { OrderStatusCount } from '@laam/types';

import {
  getReturnRatio,
  getStatusCount,
  getTotalOrderCount,
  MOCK_STATUS_COUNTS,
} from '@/features/orders/data/mock-status-counts';

export function useStatusCounts() {
  return React.useMemo(
    () => ({
      counts: MOCK_STATUS_COUNTS as OrderStatusCount[],
      total: getTotalOrderCount(),
      returnRatio: getReturnRatio(),
      getCount: getStatusCount,
      isLoading: false,
    }),
    [],
  );
}
