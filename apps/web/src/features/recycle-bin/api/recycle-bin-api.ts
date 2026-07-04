import type { RecycleBinItem, RecycleListQuery } from '@laam/types';

import {
  listRecycleItems,
  purgeItem,
  restoreItem,
} from '@/features/recycle-bin/data/mock-recycle-bin';
import { apiRequest } from '@/lib/api/client';

export type RecycleBinApi = {
  list: (query?: RecycleListQuery) => Promise<RecycleBinItem[]>;
  restore: (id: string) => Promise<void>;
  purge: (id: string) => Promise<void>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockRecycleBinApi(): RecycleBinApi {
  return {
    async list(query) {
      await delay(80);
      return listRecycleItems(query);
    },
    async restore(id) {
      await delay(100);
      restoreItem(id);
    },
    async purge(id) {
      await delay(100);
      purgeItem(id);
    },
  };
}

export function createHttpRecycleBinApi(): RecycleBinApi {
  return {
    list: (query) => {
      const params = new URLSearchParams();
      if (query?.entityType) params.set('entityType', query.entityType);
      if (query?.search) params.set('search', query.search);
      const qs = params.toString();
      return apiRequest(`/crm/recycle-bin${qs ? `?${qs}` : ''}`);
    },
    restore: (id) => apiRequest(`/crm/recycle-bin/${id}/restore`, { method: 'POST' }),
    purge: (id) => apiRequest(`/crm/recycle-bin/${id}`, { method: 'DELETE' }),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const recycleBinApi = useHttpApi ? createHttpRecycleBinApi() : createMockRecycleBinApi();
