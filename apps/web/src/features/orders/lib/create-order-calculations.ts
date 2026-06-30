import type {
  CreateOrderFormState,
  CreateOrderLineItem,
  CreateOrderTotals,
  DiscountMode,
} from '@/features/orders/lib/create-order-types';

export function calcLineSubtotal(item: Pick<CreateOrderLineItem, 'unitPrice' | 'quantity' | 'discount'>): number {
  return Math.max(0, item.unitPrice * item.quantity - item.discount);
}

export function calcSubtotal(lineItems: CreateOrderLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.subtotal, 0);
}

export function calcOrderDiscount(
  subtotal: number,
  mode: DiscountMode,
  value: number,
): number {
  if (value <= 0 || subtotal <= 0) {
    return 0;
  }

  if (mode === 'percent') {
    return Math.min(subtotal, (subtotal * value) / 100);
  }

  return Math.min(subtotal, value);
}

export function calcCouponDiscount(
  afterOrderDiscount: number,
  couponApplied: boolean,
): number {
  if (!couponApplied || afterOrderDiscount <= 0) {
    return 0;
  }

  return (afterOrderDiscount * 10) / 100;
}

export function calcCreateOrderTotals(state: Pick<
  CreateOrderFormState,
  | 'lineItems'
  | 'discountMode'
  | 'discountValue'
  | 'shipping'
  | 'advancePayment'
  | 'couponApplied'
>): CreateOrderTotals {
  const subtotal = calcSubtotal(state.lineItems);
  const orderDiscount = calcOrderDiscount(
    subtotal,
    state.discountMode,
    state.discountValue,
  );
  const afterOrderDiscount = Math.max(0, subtotal - orderDiscount);
  const couponDiscount = calcCouponDiscount(afterOrderDiscount, state.couponApplied);
  const afterDiscount = Math.max(0, afterOrderDiscount - couponDiscount);
  const grandTotal = Math.max(0, afterDiscount + state.shipping);
  const due = Math.max(0, grandTotal - state.advancePayment);

  return {
    subtotal,
    orderDiscount,
    couponDiscount,
    afterDiscount,
    grandTotal,
    due,
  };
}
