import type { OrderStatusConfig } from '@laam/types';
import type { OrderQueuePage } from '@laam/types';

import { MOCK_ORDER_STATUSES, MOCK_ORDER_QUEUE_PAGES } from '@/features/orders/data/mock-status-config';

const STORAGE_KEY = 'laam-order-status-overrides';
const STATUS_SESSION_CACHE_KEY = 'laam-order-statuses-session';
const QUEUE_SESSION_CACHE_KEY = 'laam-order-queues-session';
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

function readSessionJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeSessionJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota / private mode — in-memory still works this session.
  }
}

/** Warm serverCaches from sessionStorage without emitting (safe during render). */
function warmStatusesFromSession(): OrderStatusConfig[] | null {
  if (serverStatuses) return serverStatuses;
  const cached = readSessionJson<OrderStatusConfig[]>(STATUS_SESSION_CACHE_KEY);
  if (!Array.isArray(cached) || cached.length === 0) return null;
  if (!cached.every((item) => item && typeof item.slug === 'string' && typeof item.label === 'string')) {
    return null;
  }
  serverStatuses = cached;
  return cached;
}

function warmQueuesFromSession(): OrderQueuePage[] | null {
  if (serverQueues) return serverQueues;
  const cached = readSessionJson<OrderQueuePage[]>(QUEUE_SESSION_CACHE_KEY);
  if (!Array.isArray(cached) || cached.length === 0) return null;
  if (!cached.every((item) => item && typeof item.slug === 'string' && typeof item.href === 'string')) {
    return null;
  }
  serverQueues = cached;
  return cached;
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
  writeSessionJson(STATUS_SESSION_CACHE_KEY, statuses);
  emitChanged();
  return statuses;
}

export function setServerOrderQueues(queues: OrderQueuePage[]): OrderQueuePage[] {
  serverQueues = queues;
  writeSessionJson(QUEUE_SESSION_CACHE_KEY, queues);
  emitChanged();
  return queues;
}

/** Drop in-memory + session caches (call when switching organization). */
export function clearServerOrderConfigCache(): void {
  serverStatuses = null;
  serverQueues = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STATUS_SESSION_CACHE_KEY);
      sessionStorage.removeItem(QUEUE_SESSION_CACHE_KEY);
    } catch {
      // ignore
    }
  }
  emitChanged();
}

export function getServerOrderStatuses(): OrderStatusConfig[] | null {
  return serverStatuses;
}

export function getOrderQueuePages(): OrderQueuePage[] {
  if (useApi) {
    if (serverQueues) return serverQueues;
    const warmed = warmQueuesFromSession();
    if (warmed) return warmed;
    return MOCK_ORDER_QUEUE_PAGES;
  }
  return MOCK_ORDER_QUEUE_PAGES;
}

export function getOrderStatuses(): OrderStatusConfig[] {
  if (useApi) {
    if (serverStatuses) return serverStatuses;
    // Sync restore last known org statuses so reload deep-links resolve before API returns.
    const warmed = warmStatusesFromSession();
    if (warmed) return warmed;
    // Cold start / SSR: seed defaults until API hydrate.
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
