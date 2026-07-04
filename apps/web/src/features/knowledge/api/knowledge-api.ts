import type {
  CreateKnowledgeArticlePayload,
  KnowledgeArticle,
  KnowledgeSearchQuery,
} from '@laam/types';

import {
  createKnowledgeArticle,
  deleteKnowledgeArticle,
  getKnowledgeArticle,
  listKnowledgeArticles,
  updateKnowledgeArticle,
} from '@/features/knowledge/data/mock-knowledge';
import { apiRequest } from '@/lib/api/client';

export type KnowledgeApi = {
  list: (query?: KnowledgeSearchQuery) => Promise<KnowledgeArticle[]>;
  get: (id: string) => Promise<KnowledgeArticle | null>;
  create: (payload: CreateKnowledgeArticlePayload) => Promise<KnowledgeArticle>;
  update: (id: string, patch: Partial<CreateKnowledgeArticlePayload>) => Promise<KnowledgeArticle>;
  remove: (id: string) => Promise<void>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockKnowledgeApi(): KnowledgeApi {
  return {
    async list(query) {
      await delay(80);
      return listKnowledgeArticles(query);
    },
    async get(id) {
      await delay(50);
      return getKnowledgeArticle(id) ?? null;
    },
    async create(payload) {
      await delay(100);
      return createKnowledgeArticle(payload);
    },
    async update(id, patch) {
      await delay(100);
      const article = updateKnowledgeArticle(id, patch);
      if (!article) throw new Error('Article not found');
      return article;
    },
    async remove(id) {
      await delay(80);
      deleteKnowledgeArticle(id);
    },
  };
}

export function createHttpKnowledgeApi(): KnowledgeApi {
  return {
    list: (query) => {
      const params = new URLSearchParams();
      if (query?.channel) params.set('channel', query.channel);
      if (query?.q) params.set('q', query.q);
      if (query?.status) params.set('status', query.status);
      const qs = params.toString();
      return apiRequest(`/crm/knowledge${qs ? `?${qs}` : ''}`);
    },
    get: (id) => apiRequest(`/crm/knowledge/${id}`),
    create: (payload) =>
      apiRequest('/crm/knowledge', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, patch) =>
      apiRequest(`/crm/knowledge/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id) => apiRequest(`/crm/knowledge/${id}`, { method: 'DELETE' }),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const knowledgeApi = useHttpApi ? createHttpKnowledgeApi() : createMockKnowledgeApi();
