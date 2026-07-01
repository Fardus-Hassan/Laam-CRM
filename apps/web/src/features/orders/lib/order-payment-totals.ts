import type { OrderDetail } from '@laam/types';

/** Matches list-row paid/due math until OrderDetail exposes ledger fields from the API. */
export function calcOrderPaymentTotals(
  order: Pick<OrderDetail, 'amount' | 'paymentStatus'>,
) {
  const paid =
    order.paymentStatus === 'paid'
      ? order.amount
      : order.paymentStatus === 'partial'
        ? Math.round(order.amount * 0.5)
        : 0;
  return { paid, due: Math.max(0, order.amount - paid) };
}
