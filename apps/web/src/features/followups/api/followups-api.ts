import type {
  CreateFollowupPayload,
  FollowupDetail,
  FollowupListQuery,
  FollowupListResponse,
  FollowupStatus,
  UpdateFollowupPayload,
} from '@laam/types';

import { getMockCustomerById, updateMockCustomer } from '@/features/customers/data/mock-customers';
import {
  bulkUpdateMockFollowups,
  createMockFollowupForCustomer,
  filterMockFollowups,
  getMockFollowupById,
  updateMockFollowup,
} from '@/features/followups/data/mock-followups';

export type FollowupsApi = {
  listFollowups: (query: FollowupListQuery) => Promise<FollowupListResponse>;
  getFollowup: (id: string) => Promise<FollowupDetail | null>;
  createFollowup: (payload: CreateFollowupPayload) => Promise<FollowupDetail>;
  updateFollowup: (id: string, patch: UpdateFollowupPayload) => Promise<FollowupDetail>;
  bulkAction: (payload: {
    followupIds: string[];
    scheduleDate?: string;
    followupStatus?: FollowupStatus;
    assignedAgentName?: string;
    tags?: string[];
    note?: string;
  }) => Promise<{ successCount: number; failedCount: number; message?: string }>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockFollowupsApi(): FollowupsApi {
  return {
    async listFollowups(query) {
      await delay(120);
      return filterMockFollowups(query);
    },
    async getFollowup(id) {
      await delay(80);
      return getMockFollowupById(id) ?? null;
    },
    async createFollowup(payload) {
      await delay(120);
      const customer = getMockCustomerById(payload.customerId);
      if (!customer) throw new Error('Customer not found');
      const created = createMockFollowupForCustomer({
        customerId: customer.id,
        customerNumber: customer.customerNumber,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        district: customer.district,
        agentName: payload.assignedAgentName ?? customer.assignedAgentName,
        note: payload.note,
        scheduleDate: payload.scheduleDate,
      });
      if (payload.scheduleDate) {
        updateMockCustomer(customer.id, {
          hasFollowUp: true,
          followUpDue: payload.scheduleDate,
        });
      } else {
        updateMockCustomer(customer.id, { hasFollowUp: true });
      }
      return created;
    },
    async updateFollowup(id, patch) {
      await delay(100);
      const updated = updateMockFollowup(id, patch);
      if (!updated) throw new Error('Follow-up not found');
      return updated;
    },
    async bulkAction(payload) {
      await delay(150);
      const result = bulkUpdateMockFollowups(payload);
      return { ...result, message: `Updated ${result.successCount} follow-up(s)` };
    },
  };
}

export function createHttpFollowupsApi(): FollowupsApi {
  return {
    async listFollowups(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      params.set('queue', String(query.queue));
      if (query.filter) params.set('filter', query.filter);
      if (query.search) params.set('search', query.search);
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      return apiRequest<FollowupListResponse>(`/crm/followups?${params.toString()}`);
    },
    async getFollowup(id) {
      const { apiRequest } = await import('@/lib/api/client');
      try {
        return await apiRequest<FollowupDetail>(`/crm/followups/${id}`);
      } catch {
        return null;
      }
    },
    async createFollowup(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<FollowupDetail>('/crm/followups', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateFollowup(id, patch) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<FollowupDetail>(`/crm/followups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
    async bulkAction(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<{ successCount: number; failedCount: number; message?: string }>(
        '/crm/followups/bulk',
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const followupsApi = useHttpApi ? createHttpFollowupsApi() : createMockFollowupsApi();
