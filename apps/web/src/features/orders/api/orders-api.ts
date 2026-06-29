import type { OrderListQuery, OrderListResponse } from '@laam/types';

import type { OrderDetail } from '@laam/types';

import { filterMockOrders, getMockOrderById } from '@/features/orders/data/mock-orders';

export type OrdersApi = {
  listOrders: (query: OrderListQuery) => Promise<OrderListResponse>;
  getOrder: (orderNumber: string) => Promise<OrderDetail | null>;
};

export function createMockOrdersApi(): OrdersApi {
  return {
    async listOrders(query) {
      return filterMockOrders(query);
    },
    async getOrder(orderNumber) {
      return getMockOrderById(orderNumber) ?? null;
    },
  };
}

export function createHttpOrdersApi(): OrdersApi {
  return {
    async listOrders(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams();

      if (query.status) {
        params.set('status', query.status);
      }
      if (query.search) {
        params.set('search', query.search);
      }
      if (query.source) {
        params.set('source', query.source);
      }
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));

      const suffix = params.toString() ? `?${params.toString()}` : '';
      return apiRequest<OrderListResponse>(`${crmEndpoints.orders}${suffix}`);
    },
    async getOrder(orderNumber) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');

      try {
        return await apiRequest<OrderDetail>(`${crmEndpoints.orders}/${orderNumber}`);
      } catch {
        return null;
      }
    },
  };
}

export const ordersApi =
  process.env.NEXT_PUBLIC_USE_API === 'true' ? createHttpOrdersApi() : createMockOrdersApi();
