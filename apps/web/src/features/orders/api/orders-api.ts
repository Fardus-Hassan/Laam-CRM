import type { OrderListQuery, OrderListResponse, OrderListRowResponse } from '@laam/types';

import type { OrderDetail } from '@laam/types';

import { filterMockOrderRows, filterMockOrders, getMockOrderById } from '@/features/orders/data/mock-orders';

export type OrdersApi = {
  listOrders: (query: OrderListQuery) => Promise<OrderListResponse>;
  listOrderRows: (query: OrderListQuery) => Promise<OrderListRowResponse>;
  getOrder: (orderNumber: string) => Promise<OrderDetail | null>;
};

export function createMockOrdersApi(): OrdersApi {
  return {
    async listOrders(query) {
      return filterMockOrders(query);
    },
    async listOrderRows(query) {
      return filterMockOrderRows(query);
    },
    async getOrder(orderNumber) {
      return getMockOrderById(orderNumber) ?? null;
    },
  };
}

export function createHttpOrdersApi(): OrdersApi {
  async function fetchList(query: OrderListQuery): Promise<OrderListRowResponse> {
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
    if (query.sortBy) {
      params.set('sortBy', query.sortBy);
    }
    if (query.sortDir) {
      params.set('sortDir', query.sortDir);
    }
    params.set('page', String(query.page));
    params.set('pageSize', String(query.pageSize));

    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await apiRequest<OrderListResponse>(`${crmEndpoints.orders}${suffix}`);
    return {
      ...response,
      items: response.items.map((item) => ({
        ...item,
        hasNote: false,
        products: [],
        shippingAddress: item.shippingArea,
        subtotal: item.amount,
        discount: 0,
        paid: 0,
        due: item.amount,
      })),
    };
  }

  return {
    async listOrders(query) {
      return fetchList(query);
    },
    async listOrderRows(query) {
      return fetchList(query);
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
