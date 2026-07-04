'use client';

import * as React from 'react';

import {
  getOrderStatuses,
  ORDER_STATUSES_CHANGED,
} from '@/features/orders/data/order-status-store';
import { MOCK_ORDER_QUEUE_PAGES } from '@/features/orders/data/mock-status-config';

export function useOrderStatusConfig() {
  const [version, setVersion] = React.useState(0);

  React.useEffect(() => {
    function onStatusesChanged() {
      setVersion((v) => v + 1);
    }
    window.addEventListener(ORDER_STATUSES_CHANGED, onStatusesChanged);
    return () => window.removeEventListener(ORDER_STATUSES_CHANGED, onStatusesChanged);
  }, []);

  return React.useMemo(
    () => ({
      statuses: getOrderStatuses(),
      queuePages: MOCK_ORDER_QUEUE_PAGES,
      isLoading: false,
    }),
    [version],
  );
}
