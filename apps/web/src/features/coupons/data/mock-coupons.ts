import type { Coupon, CreateCouponPayload } from '@laam/types';
import { newBrowserId } from '@/lib/device-id';

let coupons: Coupon[] = [
  { id: 'cp-1', code: 'RAMADAN10', type: 'percent', value: 10, minOrderBdt: 1000, maxDiscountBdt: 500, usageCount: 48, usageLimit: 200, expiresAt: '2026-08-01', isActive: true, description: 'Ramadan special 10% off' },
  { id: 'cp-2', code: 'FIRST100', type: 'fixed', value: 100, minOrderBdt: 800, usageCount: 120, usageLimit: 500, isActive: true, description: 'First order ৳100 off' },
  { id: 'cp-3', code: 'COMBO50', type: 'fixed', value: 50, usageCount: 32, isActive: true, description: 'Combo pack discount' },
  { id: 'cp-4', code: 'OLD20', type: 'percent', value: 20, usageCount: 90, usageLimit: 100, expiresAt: '2026-06-01', isActive: false, description: 'Expired promo' },
];

export function listCoupons(): Coupon[] {
  return [...coupons];
}

export function createCoupon(payload: CreateCouponPayload): Coupon {
  const coupon: Coupon = {
    id: `cp-${newBrowserId().slice(0, 8)}`,
    code: payload.code.toUpperCase(),
    type: payload.type,
    value: payload.value,
    minOrderBdt: payload.minOrderBdt,
    maxDiscountBdt: payload.maxDiscountBdt,
    usageCount: 0,
    usageLimit: payload.usageLimit,
    expiresAt: payload.expiresAt,
    isActive: true,
    description: payload.description,
  };
  coupons = [coupon, ...coupons];
  return coupon;
}

export function toggleCoupon(id: string): Coupon | undefined {
  coupons = coupons.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c));
  return coupons.find((c) => c.id === id);
}

export function getActiveCouponByCode(code: string): Coupon | undefined {
  const normalized = code.trim().toUpperCase();
  return coupons.find((c) => c.code === normalized && c.isActive);
}

export function recordCouponUsage(code: string): Coupon | undefined {
  const coupon = getActiveCouponByCode(code);
  if (!coupon) return undefined;
  coupons = coupons.map((c) =>
    c.id === coupon.id ? { ...c, usageCount: c.usageCount + 1 } : c,
  );
  return coupons.find((c) => c.id === coupon.id);
}

/** Discount amount for order subtotal after other discounts. */
export function calcCouponDiscountAmount(code: string, afterOrderDiscount: number): number {
  const coupon = getActiveCouponByCode(code);
  if (!coupon || afterOrderDiscount <= 0) return 0;
  if (coupon.minOrderBdt && afterOrderDiscount < coupon.minOrderBdt) return 0;
  let discount =
    coupon.type === 'percent'
      ? (afterOrderDiscount * coupon.value) / 100
      : coupon.value;
  if (coupon.maxDiscountBdt) discount = Math.min(discount, coupon.maxDiscountBdt);
  return Math.min(discount, afterOrderDiscount);
}
