import type {
  BlockedEntry,
  BlockedListQuery,
  BlockedListResponse,
  CreateBlockedEntryPayload,
} from '@laam/types';

import {
  createBlockedEntry,
  deleteBlockedEntry,
  filterBlocked,
} from '@/features/security/data/mock-security';
import { apiRequest } from '@/lib/api/client';

export type SecurityApi = {
  listBlocked: (query: BlockedListQuery) => Promise<BlockedListResponse>;
  createBlocked: (payload: CreateBlockedEntryPayload) => Promise<BlockedEntry>;
  deleteBlocked: (id: string) => Promise<void>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockSecurityApi(): SecurityApi {
  return {
    async listBlocked(query) {
      await delay(120);
      return filterBlocked(query);
    },
    async createBlocked(payload) {
      await delay(150);
      return createBlockedEntry(payload);
    },
    async deleteBlocked(id) {
      await delay(100);
      deleteBlockedEntry(id);
    },
  };
}

export function createHttpSecurityApi(): SecurityApi {
  return {
    listBlocked: (query) => {
      const params = new URLSearchParams();
      if (query.type) params.set('type', query.type);
      if (query.search) params.set('search', query.search);
      if (query.page) params.set('page', String(query.page));
      if (query.pageSize) params.set('pageSize', String(query.pageSize));
      const qs = params.toString();
      return apiRequest<BlockedListResponse>(`/crm/security/blocked${qs ? `?${qs}` : ''}`);
    },
    createBlocked: (payload) =>
      apiRequest<BlockedEntry>('/crm/security/blocked', { method: 'POST', body: JSON.stringify(payload) }),
    deleteBlocked: (id) =>
      apiRequest<void>(`/crm/security/blocked/${id}`, { method: 'DELETE' }),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const securityApi = useHttpApi ? createHttpSecurityApi() : createMockSecurityApi();
