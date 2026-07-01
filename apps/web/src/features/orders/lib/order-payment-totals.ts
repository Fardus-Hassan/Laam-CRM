import type { OrderDetail } from '@laam/types';

const paidAmountByOrderId = new Map<string, number>();

/** Register explicit paid amount for partial/COD orders (mock ledger). */
export function registerOrderPaidAmount(orderId: string, paid: number) {
  paidAmountByOrderId.set(orderId, Math.max(0, paid));
}

export function getRegisteredPaidAmount(orderId: string): number | undefined {
  return paidAmountByOrderId.get(orderId);
}

export function calcOrderPaymentTotals(
  order: Pick<OrderDetail, 'id' | 'amount' | 'paymentStatus'>,
) {
  const registered = paidAmountByOrderId.get(order.id);

  const paid =
    order.paymentStatus === 'paid'
      ? order.amount
      : order.paymentStatus === 'partial'
        ? (registered ?? Math.round(order.amount * 0.5))
        : 0;

  return { paid, due: Math.max(0, order.amount - paid) };
}

/** Seed paid amounts from payment status when building mock orders. */
export function seedOrderPaidAmount(
  orderId: string,
  amount: number,
  paymentStatus: OrderDetail['paymentStatus'],
  seedIndex = 0,
) {
  if (paymentStatus === 'paid') {
    registerOrderPaidAmount(orderId, amount);
  } else if (paymentStatus === 'partial') {
    const ratio = 0.2 + (seedIndex % 4) * 0.1;
    registerOrderPaidAmount(orderId, Math.round(amount * ratio));
  } else {
    registerOrderPaidAmount(orderId, 0);
  }
}
