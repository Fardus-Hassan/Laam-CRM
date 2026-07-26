import type { OrderPaymentListQuery, OrderPaymentListResponse, OrderPaymentRecord } from '@laam/types';

import {
  filterMockOrderPayments,
  reconcileMockPayment,
} from '@/features/orders/data/mock-order-payments';

export type OrderPaymentsApi = {
  listPayments: (query: OrderPaymentListQuery) => Promise<OrderPaymentListResponse>;
  reconcilePayment: (paymentId: string) => Promise<OrderPaymentRecord>;
  recordPayment: (
    orderId: string,
    payload: { amount: number; method?: string; note?: string },
  ) => Promise<OrderPaymentRecord>;
};

export function createMockOrderPaymentsApi(): OrderPaymentsApi {
  return {
    async listPayments(query) {
      await new Promise((resolve) => setTimeout(resolve, 120));
      return filterMockOrderPayments(query);
    },
    async reconcilePayment(paymentId) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const updated = reconcileMockPayment(paymentId);
      if (!updated) {
        throw new Error('Payment not found');
      }
      return updated;
    },
    async recordPayment(orderId, payload) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const { addMockOrderPayment } = await import(
        '@/features/orders/data/mock-order-payments'
      );
      return addMockOrderPayment(orderId, payload);
    },
  };
}

export function createHttpOrderPaymentsApi(): OrderPaymentsApi {
  return {
    async listPayments(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      }
      return apiRequest<OrderPaymentListResponse>(
        `${crmEndpoints.orders}/payments?${params.toString()}`,
      );
    },
    async reconcilePayment(paymentId) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<OrderPaymentRecord>(
        `${crmEndpoints.orders}/payments/${paymentId}/reconcile`,
        { method: 'POST' },
      );
    },
    async recordPayment(orderId, payload) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<OrderPaymentRecord>(
        `${crmEndpoints.orders}/${encodeURIComponent(orderId)}/payments`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
    },
  };
}

export const orderPaymentsApi =
  process.env.NEXT_PUBLIC_USE_API === 'true'
    ? createHttpOrderPaymentsApi()
    : createMockOrderPaymentsApi();
