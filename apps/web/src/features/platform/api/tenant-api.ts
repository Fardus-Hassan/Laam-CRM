import type { CreateTenantRequest, Tenant, TenantListItem, TenantStatus, TenantUser } from '@laam/types';
import { env } from '@/config/env';
import { apiRequest } from '@/lib/api/client';

import {
  createTenant as createMockTenant,
  deleteTenant as deleteMockTenant,
  getTenant,
  getTenantOwner,
  listTenants,
  updateTenantStatus as updateMockTenantStatus,
} from '@/features/platform/data/mock-tenant-store';

export type CreateTenantResult = {
  tenant: Tenant;
  emailSent?: boolean;
  emailWarning?: string;
  tempPassword?: string;
  loginUrl?: string;
  ownerEmail?: string;
};

export type AddAdminResult = {
  userId: string;
  email: string;
  tempPassword?: string;
  loginUrl?: string;
  emailSent?: boolean;
  emailWarning?: string;
};

export type TenantApi = {
  listTenants: () => Promise<TenantListItem[]>;
  getTenant: (id: string) => Promise<Tenant | null>;
  createTenant: (input: CreateTenantRequest) => Promise<CreateTenantResult>;
  getTenantOwner: (tenantId: string) => Promise<TenantUser | undefined>;
  updateTenantStatus: (tenantId: string, status: TenantStatus) => Promise<Tenant>;
  deleteTenant: (tenantId: string) => Promise<{ deleted: true; id: string }>;
  addAdmin: (
    tenantId: string,
    input: { name: string; email: string },
  ) => Promise<AddAdminResult>;
};

type CreateTenantResponse = {
  tenant: Tenant;
  provision?: {
    loginUrl: string;
    email: string;
    tempPassword: string;
    emailSent?: boolean;
    emailWarning?: string;
  };
};

export function createHttpTenantApi(): TenantApi {
  return {
    listTenants: () => apiRequest<TenantListItem[]>('/platform/tenants'),
    getTenant: (id) => apiRequest<Tenant | null>(`/platform/tenants/${id}`),
    async createTenant(input) {
      const result = await apiRequest<CreateTenantResponse>('/platform/tenants', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (result.provision) {
        console.info('[Tenant provisioned]', result.provision);
      }
      return {
        tenant: result.tenant,
        emailSent: result.provision?.emailSent,
        emailWarning: result.provision?.emailWarning,
        tempPassword: result.provision?.tempPassword,
        loginUrl: result.provision?.loginUrl,
        ownerEmail: result.provision?.email ?? input.owner.email,
      };
    },
    async getTenantOwner(tenantId) {
      const owner = await apiRequest<TenantUser | null>(`/platform/tenants/${tenantId}/owner`);
      return owner ?? undefined;
    },
    updateTenantStatus(tenantId, status) {
      return apiRequest<Tenant>(`/platform/tenants/${tenantId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    deleteTenant(tenantId) {
      return apiRequest<{ deleted: true; id: string }>(`/platform/tenants/${tenantId}`, {
        method: 'DELETE',
      });
    },
    addAdmin(tenantId, input) {
      return apiRequest<AddAdminResult>(`/platform/tenants/${tenantId}/admins`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
  };
}

export function createMockTenantApi(): TenantApi {
  return {
    async listTenants() {
      const items = await listTenants();
      return Promise.all(
        items.map(async (tenant) => ({
          ...tenant,
          owner: (await getTenantOwner(tenant.id)) ?? null,
          admins: [],
        })),
      );
    },
    async getTenant(id) {
      return getTenant(id) ?? null;
    },
    async createTenant(input) {
      const tenant = await createMockTenant(input);
      return { tenant };
    },
    async getTenantOwner(tenantId) {
      return getTenantOwner(tenantId);
    },
    async updateTenantStatus(tenantId, status) {
      return updateMockTenantStatus(tenantId, status);
    },
    async deleteTenant(tenantId) {
      const deleted = deleteMockTenant(tenantId);
      if (!deleted) {
        throw new Error('Tenant not found');
      }
      return { deleted: true as const, id: tenantId };
    },
    async addAdmin() {
      throw new Error('Add admin is only available with the live API');
    },
  };
}

export const tenantApi = env.useApi ? createHttpTenantApi() : createMockTenantApi();
