'use client';

import * as React from 'react';

import {
  migrateLocalStatusOverridesIfNeeded,
  orderStatusConfigApi,
} from '@/features/orders/api/order-status-config-api';
import { orderQueueConfigApi } from '@/features/orders/api/order-queue-config-api';
import {
  clearServerOrderConfigCache,
  getOrderQueuePages,
  getOrderStatuses,
  getServerOrderStatuses,
  ORDER_STATUSES_CHANGED,
  setServerOrderQueues,
  setServerOrderStatuses,
} from '@/features/orders/data/order-status-store';

const useApi = process.env.NEXT_PUBLIC_USE_API === 'true';

/** Single-flight hydrate so nav + orders page + settings don't triple-fetch. */
let hydratePromise: Promise<void> | null = null;
let hydrateOrganizationId: string | null = null;

export function resetOrderStatusConfigHydration(organizationId?: string | null): void {
  hydratePromise = null;
  hydrateOrganizationId = organizationId ?? null;
  clearServerOrderConfigCache();
}

export function ensureOrderStatusConfigHydrated(
  organizationId?: string | null,
): Promise<void> {
  if (!useApi) return Promise.resolve();

  if (
    organizationId &&
    hydrateOrganizationId &&
    organizationId !== hydrateOrganizationId
  ) {
    resetOrderStatusConfigHydration(organizationId);
  } else if (organizationId && !hydrateOrganizationId) {
    hydrateOrganizationId = organizationId;
  }

  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      await migrateLocalStatusOverridesIfNeeded();
      const list = await orderStatusConfigApi.list();
      setServerOrderStatuses(list);
      const queues = await orderQueueConfigApi.list();
      setServerOrderQueues(queues);
    } catch {
      // Keep seed/session cache until next navigation retry.
      // Reset so a later mount can retry after transient failure.
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export function useOrderStatusConfig() {
  const [version, setVersion] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(() => {
    if (!useApi) return false;
    // Session cache may already warm memory; no need to block UI.
    getOrderStatuses();
    return getServerOrderStatuses() === null;
  });

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
    void ensureOrderStatusConfigHydrated().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

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
