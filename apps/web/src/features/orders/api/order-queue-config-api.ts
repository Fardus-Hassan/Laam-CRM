import type { OrderQueuePage, UpsertOrderQueuePagePayload } from '@laam/types';

import { MOCK_ORDER_QUEUE_PAGES } from '@/features/orders/data/mock-status-config';
import { apiRequest } from '@/lib/api/client';

export type OrderQueueConfigApi = {
  list: () => Promise<OrderQueuePage[]>;
  upsert: (payload: UpsertOrderQueuePagePayload) => Promise<OrderQueuePage>;
};

export function createMockOrderQueueConfigApi(): OrderQueueConfigApi {
  return {
    async list() {
      return MOCK_ORDER_QUEUE_PAGES;
    },
    async upsert(payload) {
      return {
        id: `queue-${payload.slug}`,
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
      };
    },
  };
}

export function createHttpOrderQueueConfigApi(): OrderQueueConfigApi {
  return {
    async list() {
      return apiRequest<OrderQueuePage[]>('/crm/settings/order-queues');
    },
    async upsert(payload) {
      return apiRequest<OrderQueuePage>('/crm/settings/order-queues', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export const orderQueueConfigApi: OrderQueueConfigApi = useHttpApi
  ? createHttpOrderQueueConfigApi()
  : createMockOrderQueueConfigApi();
