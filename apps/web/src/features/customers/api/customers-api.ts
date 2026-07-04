import type {
  CustomerDetail,
  CustomerListQuery,
  CustomerListResponse,
  CustomerStatus,
} from '@laam/types';

import {
  bulkUpdateMockCustomers,
  filterMockCustomers,
  getMockCustomerById,
  updateMockCustomer,
} from '@/features/customers/data/mock-customers';

export type CustomersApi = {
  listCustomers: (query: CustomerListQuery) => Promise<CustomerListResponse>;
  getCustomer: (id: string) => Promise<CustomerDetail | null>;
  updateCustomer: (
    id: string,
    patch: {
      notes?: string;
      tags?: string[];
      status?: CustomerStatus;
      hasFollowUp?: boolean;
      followUpDue?: string;
      assignedAgentName?: string;
    },
  ) => Promise<CustomerDetail>;
  bulkAction: (payload: {
    customerIds: string[];
    note?: string;
    status?: CustomerStatus;
    assignedAgentName?: string;
    followUpDue?: string;
  }) => Promise<{ successCount: number; failedCount: number; message?: string }>;
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
  };
}

export function createHttpCustomersApi(): CustomersApi {
  return {
    async listCustomers(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (query.segment) params.set('segment', query.segment);
      if (query.status) params.set('status', query.status);
      if (query.search) params.set('search', query.search);
      if (query.district) params.set('district', query.district);
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return apiRequest<CustomerListResponse>(`/crm/customers${suffix}`);
    },
    async getCustomer(id) {
      const { apiRequest } = await import('@/lib/api/client');
      try {
        return await apiRequest<CustomerDetail>(`/crm/customers/${id}`);
      } catch {
        return null;
      }
    },
    async updateCustomer(id, patch) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<CustomerDetail>(`/crm/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
    async bulkAction(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<{ successCount: number; failedCount: number; message?: string }>(
        '/crm/customers/bulk',
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export const customersApi = useHttpApi ? createHttpCustomersApi() : createMockCustomersApi();
