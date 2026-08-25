import type { OrderStatusConfig, UpsertOrderStatusConfigPayload } from '@laam/types';

import {
  appendOrderStatus,
  getOrderStatuses as getLocalStatuses,
  saveOrderStatusOverrides,
  upsertOrderStatusOverride,
} from '@/features/orders/data/order-status-store';
import { apiRequest } from '@/lib/api/client';

export type OrderStatusConfigApi = {
  list: () => Promise<OrderStatusConfig[]>;
  upsert: (payload: UpsertOrderStatusConfigPayload) => Promise<OrderStatusConfig>;
  /** One-shot migrate local overrides → server. */
  replaceMany: (statuses: UpsertOrderStatusConfigPayload[]) => Promise<OrderStatusConfig[]>;
};

export function createMockOrderStatusConfigApi(): OrderStatusConfigApi {
  return {
    async list() {
      return getLocalStatuses();
    },
    async upsert(payload) {
      const existing = getLocalStatuses().find((item) => item.slug === payload.slug);
      const next: OrderStatusConfig = {
        id: existing?.id ?? `status-${payload.slug}`,
        slug: payload.slug,
        label: payload.label,
        labelBn: payload.labelBn,
        color: payload.color,
        group: payload.group,
        parentSlug: payload.parentSlug,
        displayMode: payload.displayMode,
        showInSidebar: payload.showInSidebar,
        showInNestedTabs: payload.showInNestedTabs,
        sidebarOrder: payload.sidebarOrder,
        isTerminal: payload.isTerminal ?? false,
        isDefault: payload.isDefault ?? false,
        allowedTransitions: payload.allowedTransitions ?? existing?.allowedTransitions ?? [],
        bulkActions: payload.bulkActions ?? existing?.bulkActions ?? [],
        showInGroupByStatus: payload.showInGroupByStatus ?? true,
      };
      if (existing) {
        upsertOrderStatusOverride(next);
      } else {
        appendOrderStatus(next);
      }
      return next;
    },
    async replaceMany(statuses) {
      const mapped: OrderStatusConfig[] = statuses.map((payload) => ({
        id: `status-${payload.slug}`,
        slug: payload.slug,
        label: payload.label,
        labelBn: payload.labelBn,
        color: payload.color,
        group: payload.group,
        parentSlug: payload.parentSlug,
        displayMode: payload.displayMode,
        showInSidebar: payload.showInSidebar,
        showInNestedTabs: payload.showInNestedTabs,
        sidebarOrder: payload.sidebarOrder,
        isTerminal: payload.isTerminal ?? false,
        isDefault: payload.isDefault ?? false,
        allowedTransitions: payload.allowedTransitions ?? [],
        bulkActions: payload.bulkActions ?? [],
        showInGroupByStatus: payload.showInGroupByStatus ?? true,
      }));
      saveOrderStatusOverrides(mapped);
      return getLocalStatuses();
    },
  };
}

export function createHttpOrderStatusConfigApi(): OrderStatusConfigApi {
  return {
    async list() {
      return apiRequest<OrderStatusConfig[]>('/crm/settings/order-statuses');
    },
    async upsert(payload) {
      return apiRequest<OrderStatusConfig>('/crm/settings/order-statuses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async replaceMany(statuses) {
      return apiRequest<OrderStatusConfig[]>('/crm/settings/order-statuses/replace', {
        method: 'POST',
        body: JSON.stringify({ statuses }),
      });
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export const orderStatusConfigApi: OrderStatusConfigApi = useHttpApi
  ? createHttpOrderStatusConfigApi()
  : createMockOrderStatusConfigApi();

const MIGRATION_FLAG = 'laam-order-status-migrated-to-api';

/**
 * One-time cleanup of legacy browser overrides.
 * Do NOT push local overrides into the current org — that poisoned new tenants
 * with another org's status set. Seed + API remain source of truth.
 */
export async function migrateLocalStatusOverridesIfNeeded(): Promise<OrderStatusConfig[] | null> {
  if (!useHttpApi || typeof window === 'undefined') return null;
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return null;

  saveOrderStatusOverrides([]);
  localStorage.setItem(MIGRATION_FLAG, '1');
  return null;
}
