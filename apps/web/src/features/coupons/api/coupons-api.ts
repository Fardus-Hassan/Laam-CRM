import type { Coupon, CreateCouponPayload, UpdateCouponPayload } from '@laam/types';

import {
  calcCouponDiscountAmount,
  createCoupon,
  getActiveCouponByCode,
  listCoupons,
  toggleCoupon,
} from '@/features/coupons/data/mock-coupons';
import { apiRequest } from '@/lib/api/client';

export type CouponValidateResult = {
  valid: boolean;
  discount: number;
  message?: string;
  coupon?: Coupon;
};

export type CouponsApi = {
  list: () => Promise<Coupon[]>;
  create: (payload: CreateCouponPayload) => Promise<Coupon>;
  update: (id: string, payload: UpdateCouponPayload) => Promise<Coupon>;
  remove: (id: string) => Promise<void>;
  toggle: (id: string) => Promise<Coupon>;
  validate: (code: string, orderSubtotal: number) => Promise<CouponValidateResult>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let mockStore: Coupon[] | null = null;

function store(): Coupon[] {
  if (!mockStore) mockStore = listCoupons();
  return mockStore;
}

export function createMockCouponsApi(): CouponsApi {
  return {
    async list() {
      await delay(80);
      return [...store()];
    },
    async create(payload) {
      await delay(120);
      const coupon = createCoupon(payload);
      mockStore = [coupon, ...store().filter((c) => c.id !== coupon.id)];
      return coupon;
    },
    async update(id, payload) {
      await delay(100);
      const current = store().find((c) => c.id === id);
      if (!current) throw new Error('Coupon not found');
      const next: Coupon = {
        ...current,
        ...payload,
        code: payload.code ? payload.code.toUpperCase() : current.code,
        expiresAt: payload.expiresAt === null ? undefined : payload.expiresAt ?? current.expiresAt,
        minOrderBdt:
          payload.minOrderBdt === null ? undefined : payload.minOrderBdt ?? current.minOrderBdt,
        maxDiscountBdt:
          payload.maxDiscountBdt === null
            ? undefined
            : payload.maxDiscountBdt ?? current.maxDiscountBdt,
        usageLimit:
          payload.usageLimit === null ? undefined : payload.usageLimit ?? current.usageLimit,
        description:
          payload.description === null ? undefined : payload.description ?? current.description,
      };
      mockStore = store().map((c) => (c.id === id ? next : c));
      return next;
    },
    async remove(id) {
      await delay(80);
      mockStore = store().filter((c) => c.id !== id);
    },
    async toggle(id) {
      await delay(80);
      const coupon = toggleCoupon(id);
      if (!coupon) throw new Error('Coupon not found');
      mockStore = store().map((c) => (c.id === id ? coupon : c));
      return coupon;
    },
    async validate(code, orderSubtotal) {
      await delay(60);
      const coupon = getActiveCouponByCode(code);
      if (!coupon) {
        return { valid: false, discount: 0, message: 'Invalid coupon code' };
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return { valid: false, discount: 0, message: 'Coupon has expired', coupon };
      }
      if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
        return { valid: false, discount: 0, message: 'Coupon usage limit reached', coupon };
      }
      const discount = calcCouponDiscountAmount(code, orderSubtotal);
      if (discount <= 0) {
        return {
          valid: false,
          discount: 0,
          message: coupon.minOrderBdt
            ? `Minimum order ৳${coupon.minOrderBdt} required`
            : 'Coupon does not apply',
          coupon,
        };
      }
      return { valid: true, discount, coupon };
    },
  };
}

export function createHttpCouponsApi(): CouponsApi {
  return {
    list: () => apiRequest('/crm/coupons'),
    create: (payload) =>
      apiRequest('/crm/coupons', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) =>
      apiRequest(`/crm/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    remove: async (id) => {
      await apiRequest(`/crm/coupons/${id}`, { method: 'DELETE' });
    },
    toggle: (id) => apiRequest(`/crm/coupons/${id}/toggle`, { method: 'POST' }),
    validate: (code, orderSubtotal) =>
      apiRequest('/crm/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, orderSubtotal }),
      }),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const couponsApi = useHttpApi ? createHttpCouponsApi() : createMockCouponsApi();
