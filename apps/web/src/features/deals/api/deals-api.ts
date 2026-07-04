import type { DealListQuery, DealListResponse, PipelineResponse } from '@laam/types';
import type { DealDetail } from '@laam/types';

import { filterMockDeals, getMockDealById, getMockPipeline } from '@/features/deals/data/mock-deals';

export type DealsApi = {
  listDeals: (query: DealListQuery) => Promise<DealListResponse>;
  getDeal: (id: string) => Promise<DealDetail | null>;
  getPipeline: () => Promise<PipelineResponse>;
};

export function createMockDealsApi(): DealsApi {
  return {
    async listDeals(query) {
      return filterMockDeals(query);
    },
    async getDeal(id) {
      return getMockDealById(id) ?? null;
    },
    async getPipeline() {
      return getMockPipeline();
    },
  };
}

export function createHttpDealsApi(): DealsApi {
  return {
    async listDeals(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams();
      if (query.stage) params.set('stage', query.stage);
      if (query.search) params.set('search', query.search);
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return apiRequest<DealListResponse>(`${crmEndpoints.deals}${suffix}`);
    },
    async getDeal(id) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      try {
        return await apiRequest<DealDetail>(`${crmEndpoints.deals}/${id}`);
      } catch {
        return null;
      }
    },
    async getPipeline() {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      return apiRequest<PipelineResponse>(crmEndpoints.pipeline);
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const dealsApi = useHttpApi ? createHttpDealsApi() : createMockDealsApi();
