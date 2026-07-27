'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { filterNavigation } from '@/features/navigation/lib/filter-navigation';
import {
  loadOrderQueueFavorites,
  ORDER_QUEUE_FAVORITES_CHANGED,
  sortNavChildrenByFavorites,
} from '@/features/orders/lib/order-queue-favorites';
import { ORDER_STATUSES_CHANGED } from '@/features/orders/data/order-status-store';
import {
  ORDER_STATUS_COUNTS_CHANGED,
  setLiveOrderNavCounts,
} from '@/features/orders/data/order-status-counts-store';
import { isPlatformHost } from '@/lib/tenant';

const STATUS_COUNTS_POLL_MS = 60_000;

export function useNavigation() {
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const [navVersion, setNavVersion] = React.useState(0);

  React.useEffect(() => {
    function refresh() {
      setNavVersion((value) => value + 1);
    }

    window.addEventListener(ORDER_QUEUE_FAVORITES_CHANGED, refresh);
    window.addEventListener(ORDER_STATUSES_CHANGED, refresh);
    window.addEventListener(ORDER_STATUS_COUNTS_CHANGED, refresh);
    return () => {
      window.removeEventListener(ORDER_QUEUE_FAVORITES_CHANGED, refresh);
      window.removeEventListener(ORDER_STATUSES_CHANGED, refresh);
      window.removeEventListener(ORDER_STATUS_COUNTS_CHANGED, refresh);
    };
  }, []);

  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;
    if (!permissions.includes('orders.view') && !permissions.includes('settings.view')) return;

    let cancelled = false;
    void (async () => {
      try {
        const { migrateLocalStatusOverridesIfNeeded, orderStatusConfigApi } = await import(
          '@/features/orders/api/order-status-config-api'
        );
        const { setServerOrderStatuses } = await import(
          '@/features/orders/data/order-status-store'
        );
        const migrated = await migrateLocalStatusOverridesIfNeeded();
        if (cancelled) return;
        if (migrated) {
          setServerOrderStatuses(migrated);
        } else {
          const list = await orderStatusConfigApi.list();
          if (!cancelled) setServerOrderStatuses(list);
        }
      } catch {
        // Keep seed defaults until next navigation refresh
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [permissions]);

  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;
    if (!permissions.includes('orders.view')) return;

    let cancelled = false;

    async function loadCounts() {
      try {
        const { apiRequest } = await import('@/lib/api/client');
        const { crmEndpoints } = await import('@/lib/api/endpoints');
        const counts = await apiRequest<{
          byStatus: Record<string, number>;
          followupsDue: number;
          failed: number;
        }>(`${crmEndpoints.orders}/meta/status-counts`);
        if (!cancelled) {
          setLiveOrderNavCounts({
            byStatus: counts.byStatus ?? {},
            followupsDue: counts.followupsDue ?? 0,
            failed: counts.failed ?? 0,
          });
        }
      } catch {
        // keep previous badges on transient errors
      }
    }

    void loadCounts();
    const id = window.setInterval(() => {
      void loadCounts();
    }, STATUS_COUNTS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [permissions]);

  return React.useMemo(() => {
    const includePlatform = user?.role === 'super_admin' && isPlatformHost();
    const groups = filterNavigation(permissions, { includePlatform });
    const favorites = loadOrderQueueFavorites();

    return groups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.id !== 'orders' || !item.children?.length) {
          return item;
        }
        return {
          ...item,
          children: sortNavChildrenByFavorites(item.children, favorites),
        };
      }),
    }));
  }, [permissions, navVersion, user?.role]);
}
