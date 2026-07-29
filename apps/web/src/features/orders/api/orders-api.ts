import type {
  BulkActionResult,
  CreateOrderPayload,
  DuplicateCheckQuery,
  DuplicateCheckResult,
  OrderBulkActionPayload,
  OrderCourierTracking,
  OrderCustomerLookup,
  OrderDetail,
  OrderFormOptionsResponse,
  OrderListQuery,
  OrderListResponse,
  OrderListRow,
  OrderListRowResponse,
  ReturnOrderLinesPayload,
  UpdateOrderPayload,
} from '@laam/types';

import {
  bulkUpdateMockOrders,
  bulkSetFollowUp,
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
  bulkSetFollowUp: (orderIds: string[], followUpDate: string) => Promise<BulkActionResult>;
  getCourierTracking: (orderId: string) => Promise<OrderCourierTracking>;
  updateOrderNote: (orderId: string, note: string) => Promise<void>;
  getOrdersByPhone: (phone: string, excludeOrderId?: string) => Promise<OrderDetail[]>;
  quickSearchOrders: (query: string, limit?: number) => Promise<OrderListRow[]>;
  getFormOptions: () => Promise<OrderFormOptionsResponse>;
  lookupCustomer: (phone: string) => Promise<OrderCustomerLookup | null>;
  deleteOrder: (id: string) => Promise<void>;
  returnLines: (id: string, payload: ReturnOrderLinesPayload) => Promise<OrderDetail>;
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
    async bulkSetFollowUp(orderIds, followUpDate) {
      await delay(200);
      return bulkSetFollowUp(orderIds, followUpDate);
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
    async getFormOptions() {
      await delay(50);
      const { DEFAULT_COURIER_NOTE, MOCK_DISTRICTS, MOCK_ORDER_STATUSES, MOCK_ORDER_TAGS, MOCK_PAYMENT_METHODS } =
        await import('@/features/orders/data/mock-create-order');
      const { ORDER_SOURCE_LABELS } = await import('@/features/orders/config/order-status');
      return {
        statuses: MOCK_ORDER_STATUSES,
        paymentMethods: MOCK_PAYMENT_METHODS,
        sources: Object.entries(ORDER_SOURCE_LABELS).map(([value, label]) => ({ value, label })),
        districts: MOCK_DISTRICTS.map((d) => ({ value: d, label: d })),
        orderTags: MOCK_ORDER_TAGS.map((t) => ({ value: t, label: t })),
        customerTags: MOCK_ORDER_TAGS.map((t) => ({ value: t, label: t })),
        pathaoCities: [
          { value: 'Dhaka', label: 'Dhaka' },
          { value: 'Chittagong', label: 'Chittagong' },
        ],
        pathaoZones: [
          { value: 'Gulshan', label: 'Gulshan' },
          { value: 'Mirpur', label: 'Mirpur' },
        ],
        defaultCourierNote: DEFAULT_COURIER_NOTE,
        defaultShipping: 120,
      };
    },
    async lookupCustomer(phone) {
      await delay(50);
      const { lookupCustomerByMobile } = await import('@/features/orders/data/mock-create-order');
      const profile = lookupCustomerByMobile(phone);
      if (!profile) return null;
      return {
        mobile: profile.mobile,
        name: profile.name,
        email: profile.email,
        address: profile.address,
        district: profile.district,
        orderSource: profile.orderSource,
        customerTag: profile.customerTag,
        stats: profile.stats,
      };
    },
    async deleteOrder(id) {
      await delay(120);
      const store = await import('@/features/orders/data/mock-orders');
      const index = store.mockOrderStore.findIndex(
        (order) => order.id === id || order.orderNumber === id,
      );
      if (index >= 0) store.mockOrderStore.splice(index, 1);
    },
    async returnLines(id, payload) {
      await delay(120);
      const order = getMockOrderById(id);
      if (!order) throw new Error('Order not found');
      const nextLines = order.lineItems.map((line) => {
        const add = payload.lines.find((l) => l.lineItemId === line.id)?.quantity ?? 0;
        const returnedQuantity = Math.min(
          line.quantity,
          (line.returnedQuantity ?? 0) + add,
        );
        return { ...line, returnedQuantity };
      });
      const allReturned = nextLines.every(
        (l) => (l.returnedQuantity ?? 0) >= l.quantity,
      );
      return (
        updateMockOrder(order.id, {
          status: allReturned ? 'returned' : 'pending_return',
        }) ?? order
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
      items: response.items.map((item) => {
        const paid = item.paidAmount ?? 0;
        const discount = item.discount ?? 0;
        const subtotal = item.subtotal ?? item.amount;
        return {
          ...item,
          hasNote: item.hasNote ?? false,
          products: item.products ?? [],
          shippingAddress: item.shippingAddress || item.shippingArea,
          subtotal,
          discount,
          paid,
          due: Math.max(0, item.amount - paid),
        };
      }),
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
      if (query.windowHours) params.set('windowHours', String(query.windowHours));
      if (query.productIds?.length) params.set('productIds', query.productIds.join(','));
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
    async bulkSetFollowUp(orderIds, followUpDate) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<BulkActionResult>(`${crmEndpoints.orders}/bulk/follow-up`, {
        method: 'POST',
        body: JSON.stringify({ orderIds, followUpDate }),
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
      await apiRequest(`${crmEndpoints.orders}/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: note }),
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
    async getFormOptions() {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<OrderFormOptionsResponse>(`${crmEndpoints.orders}/meta/form-options`);
    },
    async lookupCustomer(phone) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams({ phone });
      return apiRequest<OrderCustomerLookup | null>(
        `${crmEndpoints.orders}/meta/customer-lookup?${params}`,
      );
    },
    async deleteOrder(id) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      await apiRequest(`${crmEndpoints.orders}/${id}`, { method: 'DELETE' });
    },
    async returnLines(id, payload) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<OrderDetail>(`${crmEndpoints.orders}/${id}/return-lines`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ordersApi =
  process.env.NEXT_PUBLIC_USE_API === 'true' ? createHttpOrdersApi() : createMockOrdersApi();
