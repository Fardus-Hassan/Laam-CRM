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
  exportCustomers: (query: CustomerListQuery) => Promise<void>;
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

function buildCustomerQueryParams(query: CustomerListQuery): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | boolean | undefined) => {
    if (value === undefined || value === '') return;
    params.set(key, String(value));
  };
  set('segment', query.segment);
  set('status', query.status);
  set('search', query.search);
  set('district', query.district);
  set('employee', query.employee);
  set('product', query.product);
  set('productExclude', query.productExclude);
  set('createdFrom', query.createdFrom);
  set('createdTo', query.createdTo);
  set('lastOrderFrom', query.lastOrderFrom);
  set('lastOrderTo', query.lastOrderTo);
  set('noOrderFrom', query.noOrderFrom);
  set('noOrderTo', query.noOrderTo);
  set('followupFrom', query.followupFrom);
  set('followupTo', query.followupTo);
  set('followupStatus', query.followupStatus);
  set('deliveredFrom', query.deliveredFrom);
  set('deliveredTo', query.deliveredTo);
  set('orderCount', query.orderCount);
  set('orderCountOp', query.orderCountOp);
  set('deliveredCount', query.deliveredCount);
  set('deliveredCountOp', query.deliveredCountOp);
  set('orderStatuses', query.orderStatuses);
  set('orderStatusesExclude', query.orderStatusesExclude);
  set('orderSources', query.orderSources);
  set('orderSourcesExclude', query.orderSourcesExclude);
  set('customerTag', query.customerTag);
  set('amountMin', query.amountMin);
  set('amountMax', query.amountMax);
  set('courierScoreMin', query.courierScoreMin);
  set('page', query.page);
  set('pageSize', query.pageSize);
  return params;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockCustomersApi(): CustomersApi {
  return {
    async listCustomers(query) {
      await delay(120);
      return filterMockCustomers(query);
    },
    async exportCustomers(query) {
      await delay(80);
      const data = filterMockCustomers({ ...query, page: 1, pageSize: 5000 });
      const header = 'Customer ID,Name,Phone,Orders,Status\n';
      const body = data.items
        .map((row) =>
          [row.customerNumber, `"${row.name}"`, row.phone, row.orderCount, row.status].join(','),
        )
        .join('\n');
      const blob = new Blob([header + body], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
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
      const params = buildCustomerQueryParams(query);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return apiRequest<CustomerListResponse>(`${crmEndpoints.customers}${suffix}`);
    },
    async exportCustomers(query) {
      const { env } = await import('@/config/env');
      const { getStoredAccessToken } = await import('@/lib/auth-token');
      const { getTenantSlugFromHost } = await import('@/lib/tenant');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = buildCustomerQueryParams({ ...query, page: 1, pageSize: 5000 });
      params.delete('page');
      params.delete('pageSize');
      const url = `${env.apiUrl}${crmEndpoints.customers}/export?${params.toString()}`;
      const token = getStoredAccessToken();
      const tenantSlug = getTenantSlugFromHost();
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
        },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `customers-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(objectUrl);
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
