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
import { PURCHASE_SEGMENTS_CHANGED } from '@/features/customers/data/purchase-segments-store';
import {
  ORDER_NAV_COUNTS_REFRESH,
  ORDER_STATUS_COUNTS_CHANGED,
  setLiveOrderNavCounts,
} from '@/features/orders/data/order-status-counts-store';
import {
  isOrderRealtimeConnected,
  ORDERS_REALTIME_CONNECTION,
} from '@/features/orders/data/order-realtime-store';
import { NAV_BADGES_CHANGED } from '@/features/navigation/data/nav-badges-store';
import {
  SIDEBAR_NAV_LAYOUT_CHANGED,
  SIDEBAR_NAV_ORDER_CHANGED,
  getLiveSidebarNavLayout,
  getLiveSidebarNavOrder,
  setLiveSidebarNavLayout,
  setLiveSidebarNavOrder,
} from '@/features/navigation/data/sidebar-nav-order-store';
import { applySidebarNavOrder } from '@/features/navigation/lib/apply-sidebar-nav-order';
import {
  applySidebarNavLayout,
  buildDefaultSidebarNavLayout,
  normalizeSidebarNavLayout,
} from '@/features/navigation/lib/sidebar-nav-layout';
import { getUniversalNavRegistry } from '@/features/navigation/config/universal-nav-registry';
import { isPlatformHost } from '@/lib/tenant';

/** Fast poll when SSE is down; slow backup when order realtime is live. */
const STATUS_COUNTS_POLL_MS = 30_000;
const STATUS_COUNTS_BACKUP_POLL_MS = 180_000;

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
    window.addEventListener(NAV_BADGES_CHANGED, refresh);
    window.addEventListener(SIDEBAR_NAV_ORDER_CHANGED, refresh);
    window.addEventListener(SIDEBAR_NAV_LAYOUT_CHANGED, refresh);
    window.addEventListener(PURCHASE_SEGMENTS_CHANGED, refresh);
    return () => {
      window.removeEventListener(ORDER_QUEUE_FAVORITES_CHANGED, refresh);
      window.removeEventListener(ORDER_STATUSES_CHANGED, refresh);
      window.removeEventListener(ORDER_STATUS_COUNTS_CHANGED, refresh);
      window.removeEventListener(NAV_BADGES_CHANGED, refresh);
      window.removeEventListener(SIDEBAR_NAV_ORDER_CHANGED, refresh);
      window.removeEventListener(SIDEBAR_NAV_LAYOUT_CHANGED, refresh);
      window.removeEventListener(PURCHASE_SEGMENTS_CHANGED, refresh);
    };
  }, []);

  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;
    if (!permissions.includes('orders.view') && !permissions.includes('settings.view')) return;

    void import('@/features/orders/hooks/use-order-status-config').then(
      ({ ensureOrderStatusConfigHydrated }) =>
        ensureOrderStatusConfigHydrated(user?.organizationId),
    );
  }, [permissions, user?.organizationId]);

  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;
    if (!permissions.includes('companies.view') && !permissions.includes('settings.view')) {
      return;
    }
    void import('@/features/customers/hooks/use-purchase-segments').then(
      ({ ensurePurchaseSegmentsHydrated }) =>
        ensurePurchaseSegmentsHydrated(user?.organizationId),
    );
  }, [permissions, user?.organizationId]);

  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;
    if (!permissions.includes('orders.view')) return;

    let cancelled = false;
    let intervalId = 0;

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

    function pollMs() {
      return isOrderRealtimeConnected()
        ? STATUS_COUNTS_BACKUP_POLL_MS
        : STATUS_COUNTS_POLL_MS;
    }

    function restartInterval() {
      window.clearInterval(intervalId);
      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        void loadCounts();
      }, pollMs());
    }

    void loadCounts();
    restartInterval();

    function onRefreshRequest() {
      void loadCounts();
    }
    function onVisibleOrFocus() {
      if (document.visibilityState === 'hidden') return;
      void loadCounts();
    }
    function onRealtimeConnection() {
      restartInterval();
    }
    window.addEventListener(ORDER_NAV_COUNTS_REFRESH, onRefreshRequest);
    window.addEventListener('focus', onVisibleOrFocus);
    document.addEventListener('visibilitychange', onVisibleOrFocus);
    window.addEventListener(ORDERS_REALTIME_CONNECTION, onRealtimeConnection);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener(ORDER_NAV_COUNTS_REFRESH, onRefreshRequest);
      window.removeEventListener('focus', onVisibleOrFocus);
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
      window.removeEventListener(ORDERS_REALTIME_CONNECTION, onRealtimeConnection);
    };
  }, [permissions, user?.organizationId]);

  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;
    if (
      !permissions.includes('orders.view') &&
      !permissions.includes('courier.view') &&
      !permissions.includes('courier.manage')
    ) {
      return;
    }

    let cancelled = false;
    let intervalId = 0;

    async function loadNavBadges() {
      try {
        const { navBadgesApi } = await import('@/features/navigation/api/nav-badges-api');
        const { setLiveNavBadges } = await import(
          '@/features/navigation/data/nav-badges-store'
        );
        const badges = await navBadgesApi.getBadges();
        if (!cancelled) setLiveNavBadges(badges);
      } catch {
        // keep previous badges
      }
    }

    function pollMs() {
      return isOrderRealtimeConnected()
        ? STATUS_COUNTS_BACKUP_POLL_MS
        : STATUS_COUNTS_POLL_MS;
    }

    function restartInterval() {
      window.clearInterval(intervalId);
      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        void loadNavBadges();
      }, pollMs());
    }

    void loadNavBadges();
    restartInterval();

    function onVisibleOrFocus() {
      if (document.visibilityState === 'hidden') return;
      void loadNavBadges();
    }
    function onRealtimeConnection() {
      restartInterval();
    }
    window.addEventListener('focus', onVisibleOrFocus);
    document.addEventListener('visibilitychange', onVisibleOrFocus);
    window.addEventListener(ORDERS_REALTIME_CONNECTION, onRealtimeConnection);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onVisibleOrFocus);
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
      window.removeEventListener(ORDERS_REALTIME_CONNECTION, onRealtimeConnection);
    };
  }, [permissions, user?.organizationId]);

  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;

    let cancelled = false;
    // Reset layout while switching org so previous tenant layout doesn't flash.
    setLiveSidebarNavLayout(null);
    setLiveSidebarNavOrder(null);

    void (async () => {
      try {
        const { brandingApi } = await import('@/features/brand/api/branding-api');
        const data = await brandingApi.get();
        if (!cancelled) {
          setLiveSidebarNavOrder(data.sidebarNavOrder ?? null);
          setLiveSidebarNavLayout(data.sidebarNavLayout ?? null);
        }
      } catch {
        // Keep PDF default until branding loads
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.organizationId]);

  return React.useMemo(() => {
    const includePlatform = user?.role === 'super_admin' && isPlatformHost();
    const filtered = filterNavigation(permissions, { includePlatform });
    const defaults = buildDefaultSidebarNavLayout(getUniversalNavRegistry());
    const savedLayout = getLiveSidebarNavLayout();
    const layout = normalizeSidebarNavLayout(savedLayout, defaults);
    const groups = applySidebarNavLayout(filtered, layout);
    const ordered =
      savedLayout == null && getLiveSidebarNavOrder()
        ? applySidebarNavOrder(groups, getLiveSidebarNavOrder())
        : groups;

    // Favorites reorder only when org customized layout — keep COO PDF order for defaults.
    if (savedLayout == null) {
      return ordered;
    }

    const favorites = loadOrderQueueFavorites();

    return ordered.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (!item.children?.length) return item;
        const hasOrderChild = item.children.some(
          (child) =>
            child.id.startsWith('orders-') ||
            child.id.startsWith('orders-status-'),
        );
        if (!hasOrderChild) return item;
        return {
          ...item,
          children: sortNavChildrenByFavorites(item.children, favorites),
        };
      }),
    }));
  }, [permissions, navVersion, user?.role, user?.organizationId]);
}
