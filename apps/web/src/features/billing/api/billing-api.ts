import type {
  BillingInvoice,
  BillingOverview,
  BillingPlanOption,
  PlatformBillingTenant,
  RechargeCreditsPayload,
} from '@laam/types';

import {
  getBillingOverview,
  listInvoices,
  listPlanOptions,
  listPlatformBilling,
  rechargeCredits,
} from '@/features/billing/data/mock-billing';
import { apiRequest } from '@/lib/api/client';

export type BillingApi = {
  getOverview: () => Promise<BillingOverview>;
  listInvoices: () => Promise<BillingInvoice[]>;
  rechargeCredits: (payload: RechargeCreditsPayload) => Promise<BillingOverview>;
  listPlanOptions: () => Promise<BillingPlanOption[]>;
  listPlatformBilling: () => Promise<PlatformBillingTenant[]>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockBillingApi(): BillingApi {
  return {
    async getOverview() {
      await delay(100);
      return getBillingOverview();
    },
    async listInvoices() {
      await delay(80);
      return listInvoices();
    },
    async rechargeCredits(payload) {
      await delay(200);
      rechargeCredits(payload);
      return getBillingOverview();
    },
    async listPlanOptions() {
      await delay(80);
      return listPlanOptions();
    },
    async listPlatformBilling() {
      await delay(100);
      return listPlatformBilling();
    },
  };
}

export function createHttpBillingApi(): BillingApi {
  return {
    getOverview: () => apiRequest<BillingOverview>('/crm/billing/overview'),
    listInvoices: () => apiRequest<BillingInvoice[]>('/crm/billing/invoices'),
    rechargeCredits: (payload) =>
      apiRequest<BillingOverview>('/crm/billing/recharge', { method: 'POST', body: JSON.stringify(payload) }),
    listPlanOptions: () => apiRequest<BillingPlanOption[]>('/crm/billing/plans'),
    listPlatformBilling: () => apiRequest<PlatformBillingTenant[]>('/crm/platform/billing'),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const billingApi = useHttpApi ? createHttpBillingApi() : createMockBillingApi();
