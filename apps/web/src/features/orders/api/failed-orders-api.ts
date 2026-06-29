import type { FailedOrderListQuery, FailedOrderListResponse } from '@laam/types';

import { filterMockFailedOrders } from '@/features/orders/data/mock-failed-orders';

export async function fetchFailedOrders(
  query: FailedOrderListQuery,
): Promise<FailedOrderListResponse> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return filterMockFailedOrders(query);
}
