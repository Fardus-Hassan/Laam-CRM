import type { CompanyListQuery, CompanyListResponse } from '@laam/types';
import type { CompanyDetail } from '@laam/types';

import { filterMockCompanies, getMockCompanyById } from '@/features/companies/data/mock-companies';

export type CompaniesApi = {
  listCompanies: (query: CompanyListQuery) => Promise<CompanyListResponse>;
  getCompany: (id: string) => Promise<CompanyDetail | null>;
};

export function createMockCompaniesApi(): CompaniesApi {
  return {
    async listCompanies(query) {
      return filterMockCompanies(query);
    },
    async getCompany(id) {
      return getMockCompanyById(id) ?? null;
    },
  };
}

export function createHttpCompaniesApi(): CompaniesApi {
  return {
    async listCompanies(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      const params = new URLSearchParams();
      if (query.status) params.set('status', query.status);
      if (query.search) params.set('search', query.search);
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return apiRequest<CompanyListResponse>(`${crmEndpoints.companies}${suffix}`);
    },
    async getCompany(id) {
      const { apiRequest } = await import('@/lib/api/client');
      const { crmEndpoints } = await import('@/lib/api/endpoints');
      try {
        return await apiRequest<CompanyDetail>(`${crmEndpoints.companies}/${id}`);
      } catch {
        return null;
      }
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const companiesApi = useHttpApi ? createHttpCompaniesApi() : createMockCompaniesApi();
