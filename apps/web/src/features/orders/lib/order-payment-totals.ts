import type { OrderDetail, PaymentStatus } from '@laam/types';

const paidAmountByOrderId = new Map<string, number>();

/** Register explicit paid amount for partial/COD orders (mock ledger). */
export function registerOrderPaidAmount(orderId: string, paid: number) {
  paidAmountByOrderId.set(orderId, Math.max(0, paid));
}

export function getRegisteredPaidAmount(orderId: string): number | undefined {
  return paidAmountByOrderId.get(orderId);
}

export function calcOrderPaymentTotals(
  order: Pick<OrderDetail, 'id' | 'amount' | 'paymentStatus'> & {
    paidAmount?: number;
  },
) {
  const registered = paidAmountByOrderId.get(order.id);
  const fromOrder =
    typeof order.paidAmount === 'number' && Number.isFinite(order.paidAmount)
      ? Math.max(0, order.paidAmount)
      : undefined;

  let paid: number;
  if (order.paymentStatus === 'paid') {
    paid = fromOrder ?? registered ?? order.amount;
  } else if (order.paymentStatus === 'partial') {
    paid = fromOrder ?? registered ?? 0;
  } else if (order.paymentStatus === 'refunded') {
    paid = fromOrder ?? registered ?? 0;
  } else {
    // cod / unpaid — still honor advance if stored
    paid = fromOrder ?? registered ?? 0;
  }

  paid = Math.min(paid, order.amount);
  return { paid, due: Math.max(0, order.amount - paid) };
}

/** Seed paid amounts from payment status when building mock orders. */
export function seedOrderPaidAmount(
  orderId: string,
  amount: number,
  paymentStatus: PaymentStatus,
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
