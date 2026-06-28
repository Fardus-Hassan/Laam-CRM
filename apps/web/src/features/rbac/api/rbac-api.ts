import type {
  CreateTenantUserRequest,
  CustomRole,
  Permission,
  TenantUser,
  UpdateTenantUserAcl,
} from '@laam/types';

import {
  createRole,
  createUser,
  deleteRole,
  getPresetById,
  getRolePermissions,
  listRoles,
  listUsers,
  PERMISSION_PRESETS,
  updateRole,
  updateUserAcl,
} from '@/features/platform/data/mock-tenant-store';

export { PERMISSION_PRESETS, getPresetById };

export type RbacApi = {
  listRoles: (organizationId: string) => Promise<CustomRole[]>;
  createRole: (
    organizationId: string,
    input: {
      name: string;
      description?: string;
      permissions: Permission[];
      presetId?: string;
    },
  ) => Promise<CustomRole>;
  updateRole: (
    organizationId: string,
    roleId: string,
    patch: Partial<Pick<CustomRole, 'name' | 'description' | 'permissions' | 'dashboardTemplate'>>,
  ) => Promise<CustomRole | null>;
  deleteRole: (organizationId: string, roleId: string) => Promise<boolean>;
  listUsers: (organizationId: string) => Promise<TenantUser[]>;
  createUser: (organizationId: string, input: CreateTenantUserRequest) => Promise<TenantUser>;
  updateUserAcl: (
    organizationId: string,
    userId: string,
    patch: UpdateTenantUserAcl & { customRoleId?: string },
  ) => Promise<TenantUser | null>;
  getRolePermissions: (
    organizationId: string,
    roleId: string | undefined,
  ) => Promise<Permission[] | undefined>;
};

export function createMockRbacApi(): RbacApi {
  return {
    async listRoles(organizationId) {
      return listRoles(organizationId);
    },
    async createRole(organizationId, input) {
      return createRole(organizationId, input);
    },
    async updateRole(organizationId, roleId, patch) {
      return updateRole(organizationId, roleId, patch) ?? null;
    },
    async deleteRole(organizationId, roleId) {
      return deleteRole(organizationId, roleId);
    },
    async listUsers(organizationId) {
      return listUsers(organizationId);
    },
    async createUser(organizationId, input) {
      return createUser(organizationId, input);
    },
    async updateUserAcl(organizationId, userId, patch) {
      return updateUserAcl(organizationId, userId, patch) ?? null;
    },
    async getRolePermissions(organizationId, roleId) {
      return getRolePermissions(organizationId, roleId);
    },
  };
}

export const rbacApi = createMockRbacApi();
