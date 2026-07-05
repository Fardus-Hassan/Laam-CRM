import type { OrderStatusConfig } from '@laam/types';

import { MOCK_ORDER_STATUSES } from '@/features/orders/data/mock-status-config';

const STORAGE_KEY = 'laam-order-status-overrides';

export const ORDER_STATUSES_CHANGED = 'laam-order-statuses-changed';

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
    window.dispatchEvent(new CustomEvent(ORDER_STATUSES_CHANGED));
  }
  return statuses;
}

export function getOrderStatuses(): OrderStatusConfig[] {
  const overrides = loadOrderStatusOverrides();
  const overrideBySlug = new Map(overrides.map((status) => [status.slug, status]));

  return MOCK_ORDER_STATUSES.map((status) => overrideBySlug.get(status.slug) ?? status).concat(
    overrides.filter(
      (status) => !MOCK_ORDER_STATUSES.some((seed) => seed.slug === status.slug),
    ),
  );
}

export function upsertOrderStatusOverride(status: OrderStatusConfig): OrderStatusConfig[] {
  const overrides = loadOrderStatusOverrides();
  const next = [...overrides.filter((item) => item.slug !== status.slug), status];
  return saveOrderStatusOverrides(next);
}

export function appendOrderStatus(status: OrderStatusConfig): OrderStatusConfig[] {
  return upsertOrderStatusOverride(status);
}
