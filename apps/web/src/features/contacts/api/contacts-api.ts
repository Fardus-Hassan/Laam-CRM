import type { ContactListQuery, ContactListResponse } from '@laam/types';
import type { ContactDetail } from '@laam/types';

import { filterMockContacts, getMockContactById } from '@/features/contacts/data/mock-contacts';

export type ContactsApi = {
  listContacts: (query: ContactListQuery) => Promise<ContactListResponse>;
  getContact: (id: string) => Promise<ContactDetail | null>;
};

export function createMockContactsApi(): ContactsApi {
  return {
    async listContacts(query) {
      return filterMockContacts(query);
    },
    async getContact(id) {
      return getMockContactById(id) ?? null;
    },
  };
}

export function createHttpContactsApi(): ContactsApi {
  return {
    async listContacts(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams();
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
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const contactsApi = useHttpApi ? createHttpContactsApi() : createMockContactsApi();
