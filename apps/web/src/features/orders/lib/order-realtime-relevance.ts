import type { OrderQueueContext } from '@/features/orders/config/order-queue-resolver';
import type { OrderRealtimePayload } from '@/features/orders/lib/order-realtime-stream';

/**
 * Whether this order queue should soft-refresh for a realtime event.
 * Avoids refetching Confirmed when a new Pending order arrives, etc.
 */
export function shouldRefreshOrderListForRealtime(
  queue: Pick<OrderQueueContext, 'kind' | 'statusFilter' | 'followUpDue' | 'childStatusSlugs'>,
  payload: OrderRealtimePayload | undefined,
  inPageStatusFilter?: string,
): boolean {
  if (!payload || payload.type === 'ping') return false;

  const activeStatus = queue.statusFilter ?? inPageStatusFilter;
  const childSlugs = queue.childStatusSlugs ?? [];

  // All Orders / unscoped: any change may affect the view.
  if (queue.kind === 'all' && !activeStatus && !queue.followUpDue) {
    return true;
  }

  // Follow-ups due: create/status/update can move rows in/out.
  if (queue.followUpDue) {
    return true;
  }

  // Parent folder without a selected child status — keep in sync.
  if (queue.kind === 'parent' && !activeStatus) {
    return true;
  }

  if (payload.reason === 'created') {
    if (!activeStatus) return true;
    if (!payload.status) return true;
    if (payload.status === activeStatus) return true;
    if (childSlugs.length > 0 && childSlugs.includes(payload.status)) return true;
    return false;
  }

  // Status change: order may enter or leave this queue (prev status unknown).
  if (payload.reason === 'status') {
    return true;
  }

  // Field updates (assign, payment, …) — refresh scoped lists softly.
  if (payload.reason === 'updated') {
    return true;
  }

  return true;
}
