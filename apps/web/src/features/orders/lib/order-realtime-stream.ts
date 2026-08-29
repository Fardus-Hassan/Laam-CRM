import { env } from '@/config/env';
import { getStoredAccessToken } from '@/lib/auth-token';
import { getTenantSlugFromHost } from '@/lib/tenant';

export type OrderRealtimePayload = {
  type?: string;
  reason?: 'created' | 'status' | 'updated';
  orderId?: string;
  status?: string;
  organizationId?: string;
  at?: string;
};

type OrderRealtimeHandlers = {
  onEvent: (payload: OrderRealtimePayload) => void;
  onConnected?: () => void;
  signal: AbortSignal;
};

/**
 * Authenticated SSE reader (Bearer header — EventSource can't set Auth).
 * Resolves when the stream ends; caller should reconnect with backoff.
 */
export async function openOrderRealtimeStream(
  handlers: OrderRealtimeHandlers,
): Promise<void> {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers({
    Accept: 'text/event-stream',
    Authorization: `Bearer ${token}`,
  });
  const tenantSlug = getTenantSlugFromHost();
  if (tenantSlug) {
    headers.set('X-Tenant-Slug', tenantSlug);
  }

  const response = await fetch(`${env.apiUrl}/crm/orders/meta/realtime`, {
    method: 'GET',
    headers,
    credentials: 'include',
    signal: handlers.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Order realtime stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let splitAt = buffer.indexOf('\n\n');
    while (splitAt >= 0) {
      const chunk = buffer.slice(0, splitAt);
      buffer = buffer.slice(splitAt + 2);
      const dataLine = chunk
        .split('\n')
        .map((line) => line.trimEnd())
        .find((line) => line.startsWith('data:'));
      if (dataLine) {
        const raw = dataLine.slice(5).trim();
        try {
          const payload = JSON.parse(raw) as OrderRealtimePayload;
          if (payload.type === 'connected') {
            handlers.onConnected?.();
          } else if (payload.type === 'orders_changed') {
            handlers.onEvent(payload);
          }
        } catch {
          // ignore malformed frames
        }
      }
      splitAt = buffer.indexOf('\n\n');
    }
  }
}
