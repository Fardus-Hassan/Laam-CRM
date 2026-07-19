import type {
  OrgCategory,
  OrgCategoryKind,
  UpsertOrgCategoryPayload,
} from '@laam/types';

import {
  deleteOrgCategory as deleteLocal,
  getOrgCategories as getLocal,
  setOrgCategoryActive as setLocalActive,
  upsertOrgCategory as upsertLocal,
} from '@/features/settings/data/org-categories-store';
import { apiRequest } from '@/lib/api/client';

export type OrgCategoriesApi = {
  list: (kind?: OrgCategoryKind) => Promise<OrgCategory[]>;
  upsert: (payload: UpsertOrgCategoryPayload) => Promise<OrgCategory>;
  setActive: (id: string, isActive: boolean) => Promise<OrgCategory>;
  remove: (id: string) => Promise<void>;
};

export function createMockOrgCategoriesApi(): OrgCategoriesApi {
  return {
    async list(kind) {
      if (kind) return getLocal(kind);
      return (['product', 'income', 'expense', 'knowledge'] as OrgCategoryKind[]).flatMap(
        getLocal,
      );
    },
    async upsert(payload) {
      upsertLocal(payload);
      const list = getLocal(payload.kind);
      return (
        list.find((item) => item.slug === payload.slug) ??
        list[list.length - 1]!
      );
    },
    async setActive(id, isActive) {
      const all = (['product', 'income', 'expense', 'knowledge'] as OrgCategoryKind[])
        .flatMap(getLocal)
        .find((item) => item.id === id);
      if (!all) throw new Error('Category not found');
      setLocalActive(all.kind, all.slug, isActive);
      return { ...all, isActive };
    },
    async remove(id) {
      const all = (['product', 'income', 'expense', 'knowledge'] as OrgCategoryKind[])
        .flatMap(getLocal)
        .find((item) => item.id === id);
      if (!all) throw new Error('Category not found');
      deleteLocal(all.kind, all.slug);
    },
  };
}

export function createHttpOrgCategoriesApi(): OrgCategoriesApi {
  return {
    async list(kind) {
      const qs = kind ? `?kind=${encodeURIComponent(kind)}` : '';
      return apiRequest<OrgCategory[]>(`/crm/settings/categories${qs}`);
    },
    async upsert(payload) {
      return apiRequest<OrgCategory>('/crm/settings/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async setActive(id, isActive) {
      return apiRequest<OrgCategory>(`/crm/settings/categories/${id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
    },
    async remove(id) {
      await apiRequest(`/crm/settings/categories/${id}`, { method: 'DELETE' });
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const orgCategoriesApi = useHttpApi
  ? createHttpOrgCategoriesApi()
  : createMockOrgCategoriesApi();
