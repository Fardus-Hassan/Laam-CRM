import type { OrderRealtimePayload } from '@/features/orders/lib/order-realtime-stream';

/** Fired when API SSE reports an order create / status / update for this org. */
export const ORDERS_REALTIME_CHANGED = 'laam:orders-realtime-changed';

/** Fired when the orders SSE connects or drops (for poll backoff). */
export const ORDERS_REALTIME_CONNECTION = 'laam:orders-realtime-connection';

let streamConnected = false;

export function isOrderRealtimeConnected(): boolean {
  return streamConnected;
}

export function setOrderRealtimeConnected(connected: boolean): void {
  if (streamConnected === connected) return;
  streamConnected = connected;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(ORDERS_REALTIME_CONNECTION, { detail: { connected } }),
    );
  }
}

export function notifyOrdersRealtimeChanged(payload: OrderRealtimePayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ORDERS_REALTIME_CHANGED, { detail: payload }),
  );
}
