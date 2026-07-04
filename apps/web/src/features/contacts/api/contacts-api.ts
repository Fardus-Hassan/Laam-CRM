import type {
  ContactDetail,
  ContactListQuery,
  ContactListResponse,
  CreateContactPayload,
} from '@laam/types';

import {
  bulkUpdateMockContacts,
  createMockContact,
  filterMockContacts,
  getMockContactById,
  updateMockContact,
} from '@/features/contacts/data/mock-contacts';

export type ContactsApi = {
  listContacts: (query: ContactListQuery) => Promise<ContactListResponse>;
  getContact: (id: string) => Promise<ContactDetail | null>;
  createContact: (payload: CreateContactPayload) => Promise<ContactDetail>;
  updateContact: (
    id: string,
    patch: {
      notes?: string;
      tags?: string[];
      hasFollowUp?: boolean;
      followUpDue?: string;
      assignedAgentName?: string;
    },
  ) => Promise<ContactDetail>;
  bulkAction: (payload: {
    contactIds: string[];
    note?: string;
    assignedAgentName?: string;
    followUpDue?: string;
  }) => Promise<{ successCount: number; failedCount: number; message?: string }>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockContactsApi(): ContactsApi {
  return {
    async listContacts(query) {
      await delay(120);
      return filterMockContacts(query);
    },
    async getContact(id) {
      await delay(80);
      return getMockContactById(id) ?? null;
    },
    async createContact(payload) {
      await delay(120);
      return createMockContact(payload);
    },
    async updateContact(id, patch) {
      await delay(100);
      const updated = updateMockContact(id, patch);
      if (!updated) throw new Error('Contact not found');
      return updated;
    },
    async bulkAction(payload) {
      await delay(150);
      const result = bulkUpdateMockContacts(payload);
      return { ...result, message: `Updated ${result.successCount} contact(s)` };
    },
  };
}

export function createHttpContactsApi(): ContactsApi {
  return {
    async listContacts(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams();
      if (query.segment) params.set('segment', query.segment);
      if (query.contactType) params.set('contactType', query.contactType);
      if (query.source) params.set('source', query.source);
      if (query.search) params.set('search', query.search);
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return apiRequest<ContactListResponse>(`${crmEndpoints.contacts}${suffix}`);
    },
    async getContact(id) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      try {
        return await apiRequest<ContactDetail>(`${crmEndpoints.contacts}/${id}`);
      } catch {
        return null;
      }
    },
    async createContact(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<ContactDetail>(crmEndpoints.contacts, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateContact(id, patch) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<ContactDetail>(`${crmEndpoints.contacts}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
    async bulkAction(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<{ successCount: number; failedCount: number; message?: string }>(
        `${crmEndpoints.contacts}/bulk`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const contactsApi = useHttpApi ? createHttpContactsApi() : createMockContactsApi();
