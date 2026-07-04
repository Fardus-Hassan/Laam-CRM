import type { FailedOrderListQuery, FailedOrderListResponse } from '@laam/types';

import {
  dismissMockFailedOrder,
  filterMockFailedOrders,
  retryMockFailedOrder,
} from '@/features/orders/data/mock-failed-orders';

export type FailedOrdersApi = {
  listFailedOrders: (query: FailedOrderListQuery) => Promise<FailedOrderListResponse>;
  retryFailedOrder: (id: string) => Promise<{ success: boolean; message: string }>;
  dismissFailedOrder: (id: string) => Promise<{ success: boolean }>;
};

export function createMockFailedOrdersApi(): FailedOrdersApi {
  return {
    async listFailedOrders(query) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return filterMockFailedOrders(query);
    },
    async retryFailedOrder(id) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return retryMockFailedOrder(id);
    },
    async dismissFailedOrder(id) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return { success: dismissMockFailedOrder(id) };
    },
  };
}

export function createHttpFailedOrdersApi(): FailedOrdersApi {
  return {
    async listFailedOrders(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      }
      return apiRequest<FailedOrderListResponse>(
        `${crmEndpoints.orders}/failed?${params.toString()}`,
      );
    },
    async retryFailedOrder(id) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest(`${crmEndpoints.orders}/failed/${id}/retry`, { method: 'POST' });
    },
    async dismissFailedOrder(id) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      await apiRequest(`${crmEndpoints.orders}/failed/${id}`, { method: 'DELETE' });
      return { success: true };
    },
  };
}

export const failedOrdersApi =
  process.env.NEXT_PUBLIC_USE_API === 'true'
    ? createHttpFailedOrdersApi()
    : createMockFailedOrdersApi();

/** @deprecated Use failedOrdersApi.listFailedOrders */
export async function fetchFailedOrders(query: FailedOrderListQuery) {
  return failedOrdersApi.listFailedOrders(query);
}
