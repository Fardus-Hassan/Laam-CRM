'use client';

import * as React from 'react';

import {
  migrateLocalStatusOverridesIfNeeded,
  orderStatusConfigApi,
} from '@/features/orders/api/order-status-config-api';
import { orderQueueConfigApi } from '@/features/orders/api/order-queue-config-api';
import {
  getOrderQueuePages,
  getOrderStatuses,
  ORDER_STATUSES_CHANGED,
  setServerOrderQueues,
  setServerOrderStatuses,
} from '@/features/orders/data/order-status-store';

const useApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export function useOrderStatusConfig() {
  const [version, setVersion] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(useApi);

  React.useEffect(() => {
    function onStatusesChanged() {
      setVersion((v) => v + 1);
    }
    window.addEventListener(ORDER_STATUSES_CHANGED, onStatusesChanged);
    return () => window.removeEventListener(ORDER_STATUSES_CHANGED, onStatusesChanged);
  }, []);

  React.useEffect(() => {
    if (!useApi) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const migrated = await migrateLocalStatusOverridesIfNeeded();
        if (cancelled) return;
        if (migrated) {
          setServerOrderStatuses(migrated);
        } else {
          const list = await orderStatusConfigApi.list();
          if (!cancelled) setServerOrderStatuses(list);
        }
        const queues = await orderQueueConfigApi.list();
        if (!cancelled) setServerOrderQueues(queues);
      } catch {
        // Keep seed defaults until retry
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return React.useMemo(
    () => ({
      statuses: getOrderStatuses(),
      queuePages: getOrderQueuePages(),
      isLoading,
    }),
    [version, isLoading],
  );
}
