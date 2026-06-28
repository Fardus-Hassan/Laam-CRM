import type { CreateTenantRequest, Tenant } from '@laam/types';

import {
  createTenant,
  getTenant,
  getTenantOwner,
  listTenants,
} from '@/features/platform/data/mock-tenant-store';

export type TenantApi = {
  listTenants: () => Promise<Tenant[]>;
  getTenant: (id: string) => Promise<Tenant | null>;
  createTenant: (input: CreateTenantRequest) => Promise<Tenant>;
  getTenantOwner: (tenantId: string) => Promise<ReturnType<typeof getTenantOwner>>;
};

export function createMockTenantApi(): TenantApi {
  return {
    async listTenants() {
      return listTenants();
    },
    async getTenant(id) {
      return getTenant(id) ?? null;
    },
    async createTenant(input) {
      return createTenant(input);
    },
    async getTenantOwner(tenantId) {
      return getTenantOwner(tenantId);
    },
  };
}

export const tenantApi = createMockTenantApi();
