import type { CourierOverview } from '@laam/types';

import {
  getCourierOverview,
  queueOrderForCourier,
} from '@/features/courier/data/mock-courier';
import { getOrderStore, updateMockOrder } from '@/features/orders/data/mock-orders';
import { onCourierSubmitted } from '@/features/ops-spine/domain-events';
import { apiRequest } from '@/lib/api/client';

export type CourierApi = {
  getOverview: () => Promise<CourierOverview>;
  submitOrders: (orderIds: string[], provider: string) => Promise<{ submitted: number }>;
  markInboxRead: (eventId: string) => Promise<void>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockCourierApi(): CourierApi {
  return {
    async getOverview() {
      await delay(100);
      return getCourierOverview();
    },
    async submitOrders(orderIds, provider) {
      await delay(200);
      const store = getOrderStore();
      for (const id of orderIds) {
        const order = store.find((o) => o.id === id || o.orderNumber === id);
        if (order) {
          queueOrderForCourier({
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            district: order.shippingArea,
            amountBdt: order.amount,
            status: 'ready',
          });
        }
      }
      onCourierSubmitted(orderIds, provider);
      for (const id of orderIds) {
        updateMockOrder(id, { status: 'in_courier' });
      }
      return { submitted: orderIds.length };
    },
    async markInboxRead() {
      await delay(50);
    },
  };
}

export function createHttpCourierApi(): CourierApi {
  return {
    getOverview: () => apiRequest<CourierOverview>('/crm/courier/overview'),
    submitOrders: (orderIds, provider) =>
      apiRequest('/crm/courier/submit', { method: 'POST', body: JSON.stringify({ orderIds, provider }) }),
    markInboxRead: (eventId) =>
      apiRequest(`/crm/courier/inbox/${eventId}/read`, { method: 'POST' }),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const courierApi = useHttpApi ? createHttpCourierApi() : createMockCourierApi();
