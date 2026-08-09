import type { OrderStatusConfig } from '@laam/types';
import type { OrderQueuePage } from '@laam/types';

import { MOCK_ORDER_STATUSES, MOCK_ORDER_QUEUE_PAGES } from '@/features/orders/data/mock-status-config';

const STORAGE_KEY = 'laam-order-status-overrides';
const useApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export const ORDER_STATUSES_CHANGED = 'laam-order-statuses-changed';

/** In-memory cache when API is source of truth. */
let serverStatuses: OrderStatusConfig[] | null = null;
let serverQueues: OrderQueuePage[] | null = null;

function emitChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ORDER_STATUSES_CHANGED));
  }
}

export function loadOrderStatusOverrides(): OrderStatusConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OrderStatusConfig[]) : [];
  } catch {
    return [];
  }
}

export function saveOrderStatusOverrides(statuses: OrderStatusConfig[]): OrderStatusConfig[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
    emitChanged();
  }
  return statuses;
}

/** Replace in-memory server cache (API mode). */
export function setServerOrderStatuses(statuses: OrderStatusConfig[]): OrderStatusConfig[] {
  serverStatuses = statuses;
  emitChanged();
  return statuses;
}

export function setServerOrderQueues(queues: OrderQueuePage[]): OrderQueuePage[] {
  serverQueues = queues;
  emitChanged();
  return queues;
}

export function getServerOrderStatuses(): OrderStatusConfig[] | null {
  return serverStatuses;
}

export function getOrderQueuePages(): OrderQueuePage[] {
  if (useApi && serverQueues) return serverQueues;
  return MOCK_ORDER_QUEUE_PAGES;
}

export function getOrderStatuses(): OrderStatusConfig[] {
  if (useApi && serverStatuses) {
    return serverStatuses;
  }

  // API mode before hydrate: seed defaults (SSR / first paint)
  if (useApi) {
    return MOCK_ORDER_STATUSES;
  }

  const overrides = loadOrderStatusOverrides();
  const overrideBySlug = new Map(overrides.map((status) => [status.slug, status]));

  return MOCK_ORDER_STATUSES.map((status) => overrideBySlug.get(status.slug) ?? status).concat(
    overrides.filter(
      (status) => !MOCK_ORDER_STATUSES.some((seed) => seed.slug === status.slug),
    ),
  );
}

export function upsertOrderStatusOverride(status: OrderStatusConfig): OrderStatusConfig[] {
  if (useApi) {
    const current = serverStatuses ?? getOrderStatuses();
    const next = [...current.filter((item) => item.slug !== status.slug), status];
    return setServerOrderStatuses(next);
  }
  const overrides = loadOrderStatusOverrides();
  const next = [...overrides.filter((item) => item.slug !== status.slug), status];
  return saveOrderStatusOverrides(next);
}

export function appendOrderStatus(status: OrderStatusConfig): OrderStatusConfig[] {
  return upsertOrderStatusOverride(status);
}
