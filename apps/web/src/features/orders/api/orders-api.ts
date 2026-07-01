import type {
  BulkActionResult,
  CreateOrderPayload,
  DuplicateCheckQuery,
  DuplicateCheckResult,
  OrderBulkActionPayload,
  OrderCourierTracking,
  OrderDetail,
  OrderListQuery,
  OrderListResponse,
  OrderListRow,
  OrderListRowResponse,
  UpdateOrderPayload,
} from '@laam/types';

import {
  bulkUpdateMockOrders,
  checkMockDuplicate,
  createMockOrder,
  filterMockOrderRows,
  filterMockOrders,
  getMockOrderById,
  getOrdersByPhone,
  orderDetailToListRow,
  quickSearchMockOrders,
  updateMockOrder,
  updateMockOrderNote,
} from '@/features/orders/data/mock-orders';
import { buildMockCourierTracking } from '@/features/orders/data/mock-courier-tracking';

export type OrdersApi = {
  listOrders: (query: OrderListQuery) => Promise<OrderListResponse>;
  listOrderRows: (query: OrderListQuery) => Promise<OrderListRowResponse>;
  getOrder: (orderNumber: string) => Promise<OrderDetail | null>;
  createOrder: (payload: CreateOrderPayload) => Promise<OrderDetail>;
  updateOrder: (id: string, patch: UpdateOrderPayload) => Promise<OrderDetail>;
  checkDuplicate: (query: DuplicateCheckQuery) => Promise<DuplicateCheckResult>;
  bulkAction: (payload: OrderBulkActionPayload) => Promise<BulkActionResult>;
  getCourierTracking: (orderId: string) => Promise<OrderCourierTracking>;
  updateOrderNote: (orderId: string, note: string) => Promise<void>;
  getOrdersByPhone: (phone: string, excludeOrderId?: string) => Promise<OrderDetail[]>;
  quickSearchOrders: (query: string, limit?: number) => Promise<OrderListRow[]>;
};

export function createMockOrdersApi(): OrdersApi {
  return {
    async listOrders(query) {
      await delay(100);
      return filterMockOrders(query);
    },
    async listOrderRows(query) {
      await delay(100);
      return filterMockOrderRows(query);
    },
    async getOrder(orderNumber) {
      await delay(80);
      return getMockOrderById(orderNumber) ?? null;
    },
    async createOrder(payload) {
      await delay(200);
      return createMockOrder(payload);
    },
    async updateOrder(id, patch) {
      await delay(150);
      const updated = updateMockOrder(id, patch);
      if (!updated) {
        throw new Error('Order not found');
      }
      return updated;
    },
    async checkDuplicate(query) {
      await delay(100);
      return checkMockDuplicate(query);
    },
    async bulkAction(payload) {
      await delay(250);
      return bulkUpdateMockOrders(payload);
    },
    async getCourierTracking(orderId) {
      await delay(80);
      return buildMockCourierTracking(orderId);
    },
    async updateOrderNote(orderId, note) {
      await delay(100);
      updateMockOrderNote(orderId, note);
    },
    async getOrdersByPhone(phone, excludeOrderId) {
      await delay(80);
      return getOrdersByPhone(phone, excludeOrderId);
    },
    async quickSearchOrders(query, limit = 8) {
      await delay(100);
      return quickSearchMockOrders(query, limit).map((order, index) =>
        orderDetailToListRow(order, index + 1),
      );
    },
  };
}

export function createHttpOrdersApi(): OrdersApi {
  async function fetchList(query: OrderListQuery): Promise<OrderListRowResponse> {
    const { apiRequest } = await import('@/lib/api/client');
    const { crmEndpoints } = await import('@/lib/api/endpoints');
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    }

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
    async createOrder(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<OrderDetail>(crmEndpoints.orders, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateOrder(id, patch) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<OrderDetail>(`${crmEndpoints.orders}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
    async checkDuplicate(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams({ phone: query.phone });
      return apiRequest<DuplicateCheckResult>(`${crmEndpoints.orders}/check-duplicate?${params}`);
    },
    async bulkAction(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<BulkActionResult>(`${crmEndpoints.orders}/bulk`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async getCourierTracking(orderId) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<OrderCourierTracking>(`${crmEndpoints.orders}/${orderId}/courier`);
    },
    async updateOrderNote(orderId, note) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      await apiRequest(`${crmEndpoints.orders}/${orderId}/note`, {
        method: 'PUT',
        body: JSON.stringify({ note }),
      });
    },
    async getOrdersByPhone(phone, excludeOrderId) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams({ phone });
      if (excludeOrderId) params.set('exclude', excludeOrderId);
      return apiRequest<OrderDetail[]>(`${crmEndpoints.orders}/by-phone?${params}`);
    },
    async quickSearchOrders(query, limit = 8) {
      const response = await fetchList({ search: query, page: 1, pageSize: limit });
      return response.items;
    },
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ordersApi =
  process.env.NEXT_PUBLIC_USE_API === 'true' ? createHttpOrdersApi() : createMockOrdersApi();
