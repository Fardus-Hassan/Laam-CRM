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
} from '@/features/orders/data/order-status-counts-store';
import {
  isOrderRealtimeConnected,
  ORDERS_REALTIME_CONNECTION,
} from '@/features/orders/data/order-realtime-store';
import { NAV_BADGES_CHANGED } from '@/features/navigation/data/nav-badges-store';
import {
  refreshNavBadges,
  refreshOrderStatusCounts,
} from '@/features/navigation/lib/nav-meta-fetch';
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

/** Backup poll only — live updates come from order SSE. */
const META_POLL_WHEN_SSE_DOWN_MS = 60_000;
const META_POLL_WHEN_SSE_UP_MS = 300_000;

function scheduleIdle(run: () => void, delayMs: number): number {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    return w.requestIdleCallback(() => run(), { timeout: delayMs + 500 });
  }
  return globalThis.setTimeout(run, delayMs) as unknown as number;
}

function cancelIdle(id: number) {
  const w = window as Window & {
    cancelIdleCallback?: (handle: number) => void;
  };
  if (typeof w.cancelIdleCallback === 'function') {
    w.cancelIdleCallback(id);
    return;
  }
  globalThis.clearTimeout(id);
}

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

  // Order statuses / queues — needed for sidebar labels; defer so list APIs go first.
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;
    if (!permissions.includes('orders.view') && !permissions.includes('settings.view')) return;

    const idleId = scheduleIdle(() => {
      void import('@/features/orders/hooks/use-order-status-config').then(
        ({ ensureOrderStatusConfigHydrated }) =>
          ensureOrderStatusConfigHydrated(user?.organizationId),
      );
    }, 150);

    return () => cancelIdle(idleId);
  }, [permissions, user?.organizationId]);

  // Purchase segments — not needed on every page; load after first paint.
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;
    if (!permissions.includes('companies.view') && !permissions.includes('settings.view')) {
      return;
    }
    const idleId = scheduleIdle(() => {
      void import('@/features/customers/hooks/use-purchase-segments').then(
        ({ ensurePurchaseSegmentsHydrated }) =>
          ensurePurchaseSegmentsHydrated(user?.organizationId),
      );
    }, 800);

    return () => cancelIdle(idleId);
  }, [permissions, user?.organizationId]);

  // Sidebar status counts — live via SSE; poll is backup only.
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;
    if (!permissions.includes('orders.view')) return;

    let intervalId = 0;

    function pollMs() {
      return isOrderRealtimeConnected()
        ? META_POLL_WHEN_SSE_UP_MS
        : META_POLL_WHEN_SSE_DOWN_MS;
    }

    function restartInterval() {
      window.clearInterval(intervalId);
      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        void refreshOrderStatusCounts({ force: false });
      }, pollMs());
    }

    void refreshOrderStatusCounts({ force: true });
    restartInterval();

    function onRefreshRequest() {
      void refreshOrderStatusCounts({ force: true });
    }
    function onVisibleOrFocus() {
      if (document.visibilityState === 'hidden') return;
      // SSE already pushes counts; skip redundant focus spam while live.
      if (isOrderRealtimeConnected()) {
        void refreshOrderStatusCounts({ force: false });
        return;
      }
      void refreshOrderStatusCounts({ force: true });
    }
    function onRealtimeConnection() {
      restartInterval();
    }
    window.addEventListener(ORDER_NAV_COUNTS_REFRESH, onRefreshRequest);
    window.addEventListener('focus', onVisibleOrFocus);
    document.addEventListener('visibilitychange', onVisibleOrFocus);
    window.addEventListener(ORDERS_REALTIME_CONNECTION, onRealtimeConnection);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(ORDER_NAV_COUNTS_REFRESH, onRefreshRequest);
      window.removeEventListener('focus', onVisibleOrFocus);
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
      window.removeEventListener(ORDERS_REALTIME_CONNECTION, onRealtimeConnection);
    };
  }, [permissions, user?.organizationId]);

  // Non-order badges (tasks, courier, …) — stagger after status-counts so orders list isn't starved.
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;
    if (
      !permissions.includes('orders.view') &&
      !permissions.includes('courier.view') &&
      !permissions.includes('courier.manage')
    ) {
      return;
    }

    let intervalId = 0;
    let cancelled = false;

    function pollMs() {
      return isOrderRealtimeConnected()
        ? META_POLL_WHEN_SSE_UP_MS
        : META_POLL_WHEN_SSE_DOWN_MS;
    }

    function restartInterval() {
      window.clearInterval(intervalId);
      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        void refreshNavBadges({ force: false });
      }, pollMs());
    }

    const idleId = scheduleIdle(() => {
      if (cancelled) return;
      void refreshNavBadges({ force: true });
      restartInterval();
    }, 400);

    function onVisibleOrFocus() {
      if (document.visibilityState === 'hidden') return;
      if (isOrderRealtimeConnected()) {
        void refreshNavBadges({ force: false });
        return;
      }
      void refreshNavBadges({ force: true });
    }
    function onRealtimeConnection() {
      restartInterval();
    }
    window.addEventListener('focus', onVisibleOrFocus);
    document.addEventListener('visibilitychange', onVisibleOrFocus);
    window.addEventListener(ORDERS_REALTIME_CONNECTION, onRealtimeConnection);

    return () => {
      cancelled = true;
      cancelIdle(idleId);
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
