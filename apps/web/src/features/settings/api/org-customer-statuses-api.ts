import type { OrgCustomerStatus, UpsertOrgCustomerStatusPayload } from '@laam/types';

import {
  createMockOrgCustomerStatusesApi,
} from '@/features/settings/data/mock-org-customer-statuses';

export type OrgCustomerStatusesApi = {
  list: () => Promise<OrgCustomerStatus[]>;
  upsert: (payload: UpsertOrgCustomerStatusPayload) => Promise<OrgCustomerStatus>;
  setActive: (id: string, isActive: boolean) => Promise<OrgCustomerStatus>;
  remove: (id: string) => Promise<void>;
};

export function createHttpOrgCustomerStatusesApi(): OrgCustomerStatusesApi {
  return {
    async list() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<OrgCustomerStatus[]>('/crm/settings/customer-statuses');
    },
    async upsert(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<OrgCustomerStatus>('/crm/settings/customer-statuses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async setActive(id, isActive) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<OrgCustomerStatus>(`/crm/settings/customer-statuses/${id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
    },
    async remove(id) {
      const { apiRequest } = await import('@/lib/api/client');
      await apiRequest(`/crm/settings/customer-statuses/${id}`, { method: 'DELETE' });
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export const orgCustomerStatusesApi = useHttpApi
  ? createHttpOrgCustomerStatusesApi()
  : createMockOrgCustomerStatusesApi();
