import { env } from '@/config/env';
import { getStoredAccessToken } from '@/lib/auth-token';
import { getTenantSlugFromHost } from '@/lib/tenant';

type UnreadStreamHandlers = {
  onUnread: (count: number) => void;
  signal: AbortSignal;
};

/**
 * Authenticated SSE reader (Bearer header — EventSource can't set Auth).
 * Resolves when the stream ends; caller should reconnect with backoff.
 */
export async function openNotificationUnreadStream(
  handlers: UnreadStreamHandlers,
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

  const response = await fetch(`${env.apiUrl}/crm/notifications/stream`, {
    method: 'GET',
    headers,
    credentials: 'include',
    signal: handlers.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Notification stream failed: ${response.status}`);
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
          const payload = JSON.parse(raw) as { type?: string; count?: number };
          if (payload.type === 'unread' && typeof payload.count === 'number') {
            handlers.onUnread(payload.count);
          }
        } catch {
          // ignore malformed frames
        }
      }
      splitAt = buffer.indexOf('\n\n');
    }
  }
}
