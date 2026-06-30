/**
 * Order status configuration — mock seed (Phase 1) → API (Phase 2).
 * Re-exports data and helpers for the order management engine.
 */
export {
  getGroupByStatusItems,
  getQueuePageBySlug,
  getSidebarStatuses,
  getStatusConfigBySlug,
  MOCK_ORDER_QUEUE_PAGES,
  MOCK_ORDER_STATUSES,
} from '@/features/orders/data/mock-status-config';

export { resolveOrderQueueFromPath, type OrderQueueContext } from '@/features/orders/config/order-queue-resolver';
export { buildOrdersNav, type OrdersNavChild } from '@/features/orders/config/build-orders-nav';
export { BULK_ACTIONS_REGISTRY, resolveBulkActions } from '@/features/orders/config/bulk-actions-registry';
