'use client';

import * as React from 'react';

import {
  MOCK_ORDER_QUEUE_PAGES,
  MOCK_ORDER_STATUSES,
} from '@/features/orders/data/mock-status-config';

export function useOrderStatusConfig() {
  return React.useMemo(
    () => ({
      statuses: MOCK_ORDER_STATUSES,
      queuePages: MOCK_ORDER_QUEUE_PAGES,
      isLoading: false,
    }),
    [],
  );
}
