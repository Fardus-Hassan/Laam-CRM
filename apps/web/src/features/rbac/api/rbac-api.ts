import type {
  CreateOrgTeamRequest,
  CreateTenantUserRequest,
  CustomRole,
  OrgTeam,
  Permission,
  TenantUser,
  UpdateOrgTeamRequest,
  UpdateTenantUserAcl,
} from '@laam/types';

import {
  createRole,
  createTeam,
  createUser,
  deleteRole,
  deleteTeam,
  getPresetById,
  getRolePermissions,
  listRoles,
  listTeams,
  listUsers,
  PERMISSION_PRESETS,
  updateRole,
  updateTeam,
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
  listTeams: (organizationId: string) => Promise<OrgTeam[]>;
  createTeam: (organizationId: string, input: CreateOrgTeamRequest) => Promise<OrgTeam>;
  updateTeam: (
    organizationId: string,
    teamId: string,
    patch: UpdateOrgTeamRequest,
  ) => Promise<OrgTeam | null>;
  deleteTeam: (organizationId: string, teamId: string) => Promise<boolean>;
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
    async listTeams(organizationId) {
      return listTeams(organizationId);
    },
    async createTeam(organizationId, input) {
      return createTeam(organizationId, input);
    },
    async updateTeam(organizationId, teamId, patch) {
      return updateTeam(organizationId, teamId, patch) ?? null;
    },
    async deleteTeam(organizationId, teamId) {
      return deleteTeam(organizationId, teamId);
    },
  };
}

export const rbacApi = createMockRbacApi();
