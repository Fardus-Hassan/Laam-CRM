import type { Coupon, CreateCouponPayload } from '@laam/types';

import { createCoupon, listCoupons, toggleCoupon } from '@/features/coupons/data/mock-coupons';
import { apiRequest } from '@/lib/api/client';

export type CouponsApi = {
  list: () => Promise<Coupon[]>;
  create: (payload: CreateCouponPayload) => Promise<Coupon>;
  toggle: (id: string) => Promise<Coupon>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockCouponsApi(): CouponsApi {
  return {
    async list() {
      await delay(80);
      return listCoupons();
    },
    async create(payload) {
      await delay(120);
      return createCoupon(payload);
    },
    async toggle(id) {
      await delay(80);
      const coupon = toggleCoupon(id);
      if (!coupon) throw new Error('Coupon not found');
      return coupon;
    },
  };
}

export function createHttpCouponsApi(): CouponsApi {
  return {
    list: () => apiRequest('/crm/coupons'),
    create: (payload) => apiRequest('/crm/coupons', { method: 'POST', body: JSON.stringify(payload) }),
    toggle: (id) => apiRequest(`/crm/coupons/${id}/toggle`, { method: 'POST' }),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const couponsApi = useHttpApi ? createHttpCouponsApi() : createMockCouponsApi();
