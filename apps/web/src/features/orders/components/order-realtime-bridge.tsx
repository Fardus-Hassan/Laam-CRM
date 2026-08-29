'use client';

import * as React from 'react';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { requestOrderNavCountsRefresh } from '@/features/orders/data/order-status-counts-store';
import {
  notifyOrdersRealtimeChanged,
  setOrderRealtimeConnected,
} from '@/features/orders/data/order-realtime-store';
import { openOrderRealtimeStream } from '@/features/orders/lib/order-realtime-stream';

/**
 * Keeps one org-scoped order SSE open while the dashboard is mounted.
 * On events: refresh sidebar counts + notify list/detail pages.
 */
export function OrderRealtimeBridge() {
  const { permissions } = usePermissions();
  const canView = permissions.includes('orders.view');

  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_API !== 'true') return;
    if (!canView) return;

    const ac = new AbortController();
    let retryTimer = 0;
    let attempt = 0;
    let debounceTimer = 0;
    let lastPayload: Parameters<typeof notifyOrdersRealtimeChanged>[0] | null = null;

    function flushEvent() {
      if (!lastPayload) return;
      const payload = lastPayload;
      lastPayload = null;
      notifyOrdersRealtimeChanged(payload);
      requestOrderNavCountsRefresh(50);
    }

    async function connect() {
      try {
        attempt = 0;
        await openOrderRealtimeStream({
          signal: ac.signal,
          onConnected: () => setOrderRealtimeConnected(true),
          onEvent: (payload) => {
            lastPayload = payload;
            window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(flushEvent, 150);
          },
        });
      } catch {
        // fall through to reconnect
      }
      setOrderRealtimeConnected(false);
      if (ac.signal.aborted) return;
      attempt += 1;
      const delay = Math.min(30_000, 1500 * 2 ** Math.min(attempt, 4));
      retryTimer = window.setTimeout(() => void connect(), delay);
    }

    void connect();

    return () => {
      ac.abort();
      window.clearTimeout(retryTimer);
      window.clearTimeout(debounceTimer);
      setOrderRealtimeConnected(false);
    };
  }, [canView]);

  return null;
}
