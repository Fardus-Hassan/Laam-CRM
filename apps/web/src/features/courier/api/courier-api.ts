import type { CourierOverview } from '@laam/types';

import {
  getCourierOverview,
  queueOrderForCourier,
} from '@/features/courier/data/mock-courier';
import { getOrderStore, updateMockOrder } from '@/features/orders/data/mock-orders';
import { onCourierSubmitted } from '@/features/ops-spine/domain-events';
import { apiRequest } from '@/lib/api/client';

export type CourierSubmitResult = {
  submitted: number;
  failed?: number;
  message?: string;
};

export type CourierApi = {
  getOverview: () => Promise<CourierOverview>;
  submitOrders: (orderIds: string[], provider: string) => Promise<CourierSubmitResult>;
  markInboxRead: (eventId: string) => Promise<void>;
  settleCod: (orderId: string) => Promise<void>;
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
      return { submitted: orderIds.length, failed: 0, message: `Booked ${orderIds.length}` };
    },
    async markInboxRead() {
      await delay(50);
    },
    async settleCod(orderId) {
      await delay(50);
      updateMockOrder(orderId, { paymentStatus: 'paid' });
    },
  };
}

export function createHttpCourierApi(): CourierApi {
  return {
    getOverview: () => apiRequest<CourierOverview>('/crm/courier/overview'),
    submitOrders: (orderIds, provider) =>
      apiRequest<CourierSubmitResult>('/crm/courier/submit', {
        method: 'POST',
        body: JSON.stringify({ orderIds, provider }),
      }),
    markInboxRead: (eventId) =>
      apiRequest(`/crm/courier/inbox/${encodeURIComponent(eventId)}/read`, {
        method: 'POST',
      }),
    settleCod: (orderId) =>
      apiRequest('/crm/courier/settle-cod', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      }),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const courierApi = useHttpApi ? createHttpCourierApi() : createMockCourierApi();
