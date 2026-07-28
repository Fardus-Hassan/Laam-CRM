import type { OrderQueuePage, UpsertOrderQueuePagePayload } from '@laam/types';

import { MOCK_ORDER_QUEUE_PAGES } from '@/features/orders/data/mock-status-config';
import { apiRequest } from '@/lib/api/client';

export type OrderQueueConfigApi = {
  list: (opts?: { includeInactive?: boolean }) => Promise<OrderQueuePage[]>;
  upsert: (payload: UpsertOrderQueuePagePayload) => Promise<OrderQueuePage>;
  rename: (id: string, label: string) => Promise<OrderQueuePage>;
  setShowInNav: (id: string, showInNav: boolean) => Promise<OrderQueuePage>;
  deactivate: (id: string) => Promise<void>;
};

export function createMockOrderQueueConfigApi(): OrderQueueConfigApi {
  const store = [...MOCK_ORDER_QUEUE_PAGES];
  return {
    async list(opts) {
      if (opts?.includeInactive) return store;
      return store.filter((q) => q.isActive !== false);
    },
    async upsert(payload) {
      const page: OrderQueuePage = {
        id: payload.id ?? `queue-${payload.slug}`,
        slug: payload.slug,
        label: payload.label,
        href: `/dashboard/orders/queues/${payload.slug}`,
        kind: 'list',
        displayMode: 'sidebar',
        sidebarOrder: payload.sidebarOrder ?? 60,
        title: payload.label,
        description: payload.description ?? '',
        showInNav: payload.showInNav ?? true,
        followUpDue: payload.followUpDue,
        defaultChildSlug: payload.defaultChildSlug ?? undefined,
        isSystem: false,
        isActive: true,
      };
      const idx = store.findIndex((q) => q.id === page.id || q.slug === page.slug);
      if (idx >= 0) store[idx] = { ...store[idx], ...page };
      else store.push(page);
      return page;
    },
    async rename(id, label) {
      const row = store.find((q) => q.id === id);
      if (!row) throw new Error('Queue not found');
      row.label = label;
      row.title = label;
      return row;
    },
    async setShowInNav(id, showInNav) {
      const row = store.find((q) => q.id === id);
      if (!row) throw new Error('Queue not found');
      row.showInNav = showInNav;
      return row;
    },
    async deactivate(id) {
      const idx = store.findIndex((q) => q.id === id);
      if (idx < 0) throw new Error('Queue not found');
      if (store[idx].isSystem) throw new Error('System queue folders cannot be deleted');
      store[idx] = { ...store[idx], isActive: false, showInNav: false };
    },
  };
}

export function createHttpOrderQueueConfigApi(): OrderQueueConfigApi {
  return {
    async list(opts) {
      const q = opts?.includeInactive ? '?includeInactive=1' : '';
      return apiRequest<OrderQueuePage[]>(`/crm/settings/order-queues${q}`);
    },
    async upsert(payload) {
      return apiRequest<OrderQueuePage>('/crm/settings/order-queues', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async rename(id, label) {
      return apiRequest<OrderQueuePage>(`/crm/settings/order-queues/${id}/label`, {
        method: 'PATCH',
        body: JSON.stringify({ label }),
      });
    },
    async setShowInNav(id, showInNav) {
      return apiRequest<OrderQueuePage>(`/crm/settings/order-queues/${id}/nav`, {
        method: 'PATCH',
        body: JSON.stringify({ showInNav }),
      });
    },
    async deactivate(id) {
      await apiRequest(`/crm/settings/order-queues/${id}`, { method: 'DELETE' });
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export const orderQueueConfigApi: OrderQueueConfigApi = useHttpApi
  ? createHttpOrderQueueConfigApi()
  : createMockOrderQueueConfigApi();
