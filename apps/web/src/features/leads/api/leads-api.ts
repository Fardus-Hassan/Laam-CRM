import type {
  CreateLeadPayload,
  LeadDetail,
  LeadListQuery,
  LeadListResponse,
  LeadPipelineQuery,
  LeadPipelineStats,
  LeadStatus,
} from '@laam/types';

import {
  buildLeadConvertPrefill,
  bulkUpdateMockLeads,
  createMockLead,
  filterMockLeads,
  getLeadPipelineStats,
  getMockLeadById,
  saveLeadConvertPrefill,
  updateMockLead,
  type LeadBulkActionResult,
  type LeadConvertPrefill,
} from '@/features/leads/data/mock-leads';

export type { LeadConvertPrefill, LeadBulkActionResult };

export type LeadsApi = {
  listLeads: (query: LeadListQuery) => Promise<LeadListResponse>;
  getPipelineStats: (query?: LeadPipelineQuery) => Promise<LeadPipelineStats>;
  getLead: (leadNumber: string) => Promise<LeadDetail | null>;
  createLead: (payload: CreateLeadPayload) => Promise<LeadDetail>;
  updateLead: (
    leadId: string,
    patch: {
      status?: LeadStatus;
      assignedAgentName?: string;
      notes?: string;
      tags?: string[];
      followUpDue?: string;
      lineItems?: LeadDetail['lineItems'];
      address?: string;
    },
  ) => Promise<LeadDetail>;
  bulkAction: (payload: {
    leadIds: string[];
    status?: LeadStatus;
    assignedAgentName?: string;
    note?: string;
    followUpDue?: string;
  }) => Promise<LeadBulkActionResult>;
  prepareConvert: (leadId: string) => Promise<LeadConvertPrefill | null>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockLeadsApi(): LeadsApi {
  return {
    async listLeads(query) {
      await delay(150);
      return filterMockLeads(query);
    },
    async getPipelineStats(query = {}) {
      await delay(80);
      return getLeadPipelineStats(query);
    },
    async getLead(leadNumber) {
      await delay(100);
      return getMockLeadById(leadNumber) ?? null;
    },
    async createLead(payload) {
      await delay(200);
      return createMockLead(payload);
    },
    async updateLead(leadId, patch) {
      await delay(150);
      const updated = updateMockLead(leadId, patch);
      if (!updated) throw new Error('Lead not found');
      return updated;
    },
    async bulkAction(payload) {
      await delay(200);
      return bulkUpdateMockLeads(payload);
    },
    async prepareConvert(leadId) {
      await delay(80);
      const lead = getMockLeadById(leadId);
      if (!lead) return null;
      if (lead.status === 'converted') {
        throw new Error('Lead already converted');
      }
      const prefill = buildLeadConvertPrefill(lead);
      saveLeadConvertPrefill(prefill);
      return prefill;
    },
  };
}

export function createHttpLeadsApi(): LeadsApi {
  return {
    async listLeads(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams();

      if (query.status) params.set('status', query.status);
      if (query.source) params.set('source', query.source);
      if (query.agent) params.set('agent', query.agent);
      if (query.search) params.set('search', query.search);
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));

      const suffix = params.toString() ? `?${params.toString()}` : '';
      return apiRequest<LeadListResponse>(`${crmEndpoints.leads}${suffix}`);
    },
    async getPipelineStats(query = {}) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams();
      if (query.source) params.set('source', query.source);
      if (query.agent) params.set('agent', query.agent);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return apiRequest<LeadPipelineStats>(`${crmEndpoints.leads}/pipeline${suffix}`);
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
    async createLead(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<LeadDetail>(crmEndpoints.leads, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateLead(leadId, patch) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<LeadDetail>(`${crmEndpoints.leads}/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
    async bulkAction(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<LeadBulkActionResult>(`${crmEndpoints.leads}/bulk`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async prepareConvert(leadId) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<LeadConvertPrefill>(`${crmEndpoints.leads}/${leadId}/convert-prefill`);
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export const leadsApi = useHttpApi ? createHttpLeadsApi() : createMockLeadsApi();
