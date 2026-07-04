import type {
  OrderPaymentListQuery,
  OrderPaymentListResponse,
  OrderPaymentRecord,
} from '@laam/types';

import { MOCK_ORDERS, mockOrderStore } from '@/features/orders/data/mock-orders';

function buildPaymentRecord(order: (typeof MOCK_ORDERS)[number], index: number): OrderPaymentRecord {
  const paid =
    order.paymentStatus === 'paid'
      ? order.amount
      : order.paymentStatus === 'partial'
        ? Math.round(order.amount * 0.5)
        : 0;
  const due = Math.max(0, order.amount - paid);
  const methods = ['cod', 'bkash', 'nagad', 'bank', 'cash'] as const;
  const statuses = ['pending', 'collected', 'reconciled'] as const;

  return {
    id: `pay-${order.id}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    amount: order.amount,
    paid,
    due,
    method: methods[index % methods.length],
    status: due === 0 ? 'reconciled' : statuses[index % statuses.length],
    collectedAt: paid > 0 ? order.createdAt : undefined,
    createdAt: order.createdAt,
  };
}

export const mockPaymentStore: OrderPaymentRecord[] = mockOrderStore
  .slice(0, 20)
  .map((order, index) => buildPaymentRecord(order, index));

export function filterMockOrderPayments(query: OrderPaymentListQuery): OrderPaymentListResponse {
  let items = [...mockPaymentStore];

  if (query.status) {
    items = items.filter((item) => item.status === query.status);
  }
  if (query.method) {
    items = items.filter((item) => item.method === query.method);
  }
  if (query.search?.trim()) {
    const search = query.search.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.orderNumber.toLowerCase().includes(search) ||
        item.customerName.toLowerCase().includes(search),
    );
  }

  const total = items.length;
  const start = (query.page - 1) * query.pageSize;
  const pageItems = items.slice(start, start + query.pageSize);

  const totalCollected = items.reduce((sum, item) => sum + item.paid, 0);
  const totalPending = items.reduce((sum, item) => sum + item.due, 0);

  return {
    items: pageItems,
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: {
      totalCollected,
      totalPending,
      recordCount: total,
    },
  };
}

export function reconcileMockPayment(paymentId: string): OrderPaymentRecord | null {
  const index = mockPaymentStore.findIndex((p) => p.id === paymentId);
  if (index < 0) {
    return null;
  }
  const current = mockPaymentStore[index];
  const updated: OrderPaymentRecord = {
    ...current,
    paid: current.amount,
    due: 0,
    status: 'reconciled',
    collectedAt: new Date().toISOString(),
  };
  mockPaymentStore[index] = updated;
  return updated;
}
