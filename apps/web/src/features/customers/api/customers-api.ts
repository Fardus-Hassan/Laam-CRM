import type {
  CreateCustomerPayload,
  CustomerDetail,
  CustomerDuplicatesResponse,
  CustomerListQuery,
  CustomerListResponse,
  CustomerStatus,
  MergeCustomersPayload,
} from '@laam/types';

import {
  bulkUpdateMockCustomers,
  filterMockCustomers,
  findDuplicatePhones,
  getMockCustomerById,
  mergeCustomers,
  updateMockCustomer,
  upsertMockCustomerFromImport,
} from '@/features/customers/data/mock-customers';

export type CustomersApi = {
  listCustomers: (query: CustomerListQuery) => Promise<CustomerListResponse>;
  getCustomer: (id: string) => Promise<CustomerDetail | null>;
  createCustomer: (payload: CreateCustomerPayload) => Promise<CustomerDetail>;
  updateCustomer: (
    id: string,
    patch: {
      notes?: string;
      tags?: string[];
      status?: CustomerStatus;
      hasFollowUp?: boolean;
      followUpDue?: string;
      assignedAgentName?: string;
      name?: string;
      phone?: string;
      email?: string;
      district?: string;
      area?: string;
      address?: string;
    },
  ) => Promise<CustomerDetail>;
  bulkAction: (payload: {
    customerIds: string[];
    note?: string;
    status?: CustomerStatus;
    assignedAgentName?: string;
    followUpDue?: string;
  }) => Promise<{ successCount: number; failedCount: number; message?: string }>;
  backfillFromOrders: () => Promise<{ created: number; linked: number }>;
  findDuplicates: () => Promise<CustomerDuplicatesResponse>;
  mergeCustomers: (payload: MergeCustomersPayload) => Promise<CustomerDetail>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockCustomersApi(): CustomersApi {
  return {
    async listCustomers(query) {
      await delay(120);
      return filterMockCustomers(query);
    },
    async getCustomer(id) {
      await delay(80);
      return getMockCustomerById(id) ?? null;
    },
    async createCustomer(payload) {
      await delay(120);
      return upsertMockCustomerFromImport({
        name: payload.name,
        phone: payload.phone,
        email: payload.email || undefined,
        address: payload.address,
        district: payload.district,
        notes: payload.notes,
      });
    },
    async updateCustomer(id, patch) {
      await delay(100);
      const updated = updateMockCustomer(id, patch);
      if (!updated) throw new Error('Customer not found');
      return updated;
    },
    async bulkAction(payload) {
      await delay(150);
      const result = bulkUpdateMockCustomers(payload);
      return {
        ...result,
        message: `Updated ${result.successCount} customer(s)`,
      };
    },
    async backfillFromOrders() {
      await delay(80);
      return { created: 0, linked: 0 };
    },
    async findDuplicates() {
      await delay(80);
      return {
        groups: findDuplicatePhones().map((g) => ({
          phone: g.phone,
          phoneNormalized: g.phone.replace(/\D/g, ''),
          customers: g.customers,
        })),
      };
    },
    async mergeCustomers(payload) {
      await delay(120);
      const result = mergeCustomers(payload.primaryId, payload.duplicateIds);
      if (!result) throw new Error('Merge failed');
      return result;
    },
  };
}

export function createHttpCustomersApi(): CustomersApi {
  return {
    async listCustomers(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams();
      if (query.segment) params.set('segment', query.segment);
      if (query.status) params.set('status', query.status);
      if (query.search) params.set('search', query.search);
      if (query.district) params.set('district', query.district);
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return apiRequest<CustomerListResponse>(`${crmEndpoints.customers}${suffix}`);
    },
    async getCustomer(id) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      try {
        return await apiRequest<CustomerDetail>(`${crmEndpoints.customers}/${id}`);
      } catch {
        return null;
      }
    },
    async createCustomer(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<CustomerDetail>(crmEndpoints.customers, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateCustomer(id, patch) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<CustomerDetail>(`${crmEndpoints.customers}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
    async bulkAction(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<{ successCount: number; failedCount: number; message?: string }>(
        `${crmEndpoints.customers}/bulk`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
    async backfillFromOrders() {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<{ created: number; linked: number }>(`${crmEndpoints.customers}/backfill`, {
        method: 'POST',
      });
    },
    async findDuplicates() {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<CustomerDuplicatesResponse>(`${crmEndpoints.customers}/duplicates`);
    },
    async mergeCustomers(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<CustomerDetail>(`${crmEndpoints.customers}/merge`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export const customersApi = useHttpApi ? createHttpCustomersApi() : createMockCustomersApi();
