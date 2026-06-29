import type { LeadListQuery, LeadListResponse } from '@laam/types';
import type { LeadDetail } from '@laam/types';

import { filterMockLeads, getMockLeadById } from '@/features/leads/data/mock-leads';

export type LeadsApi = {
  listLeads: (query: LeadListQuery) => Promise<LeadListResponse>;
  getLead: (leadNumber: string) => Promise<LeadDetail | null>;
};

export function createMockLeadsApi(): LeadsApi {
  return {
    async listLeads(query) {
      return filterMockLeads(query);
    },
    async getLead(leadNumber) {
      return getMockLeadById(leadNumber) ?? null;
    },
  };
}

export function createHttpLeadsApi(): LeadsApi {
  return {
    async listLeads(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams();

      if (query.status) {
        params.set('status', query.status);
      }
      if (query.source) {
        params.set('source', query.source);
      }
      if (query.search) {
        params.set('search', query.search);
      }
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));

      const suffix = params.toString() ? `?${params.toString()}` : '';
      return apiRequest<LeadListResponse>(`${crmEndpoints.leads}${suffix}`);
    },
    async getLead(leadNumber) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');

      try {
        return await apiRequest<LeadDetail>(`${crmEndpoints.leads}/${leadNumber}`);
      } catch {
        return null;
      }
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export const leadsApi = useHttpApi ? createHttpLeadsApi() : createMockLeadsApi();
