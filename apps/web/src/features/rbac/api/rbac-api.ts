import type {
  CreateOrgTeamRequest,
  CreateTenantUserRequest,
  CustomRole,
  OrgTeam,
  Permission,
  PermissionPreset,
  TenantUser,
  UpdateOrgTeamRequest,
  UpdateTenantUserAcl,
  UserRole,
} from '@laam/types';

import { env } from '@/config/env';
import { apiRequest } from '@/lib/api/client';
import { crmEndpoints } from '@/lib/api/endpoints';
import {
  createRole,
  createTeam,
  createUser,
  deleteCustomPreset,
  deleteRole,
  deleteTeam,
  getPresetById,
  getRolePermissions,
  listCustomPresets,
  listRoles,
  listTeams,
  listUsers,
  PERMISSION_PRESETS,
  saveCustomPreset,
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
      dashboardTemplate?: CustomRole['dashboardTemplate'];
    },
  ) => Promise<CustomRole>;
  updateRole: (
    organizationId: string,
    roleId: string,
    patch: Partial<Pick<CustomRole, 'name' | 'description' | 'permissions' | 'dashboardTemplate'>>,
  ) => Promise<CustomRole | null>;
  deleteRole: (organizationId: string, roleId: string) => Promise<boolean>;
  listCustomPresets: (organizationId: string) => Promise<PermissionPreset[]>;
  saveCustomPreset: (
    organizationId: string,
    input: { name: string; description?: string; permissions: Permission[] },
  ) => Promise<PermissionPreset>;
  deleteCustomPreset: (organizationId: string, presetId: string) => Promise<boolean>;
  listUsers: (organizationId: string) => Promise<TenantUser[]>;
  createUser: (organizationId: string, input: CreateTenantUserRequest) => Promise<TenantUser>;
  updateUserAcl: (
    organizationId: string,
    userId: string,
    patch: UpdateTenantUserAcl,
  ) => Promise<TenantUser | null>;
  updateUserStatus: (
    organizationId: string,
    userId: string,
    status: 'active' | 'suspended',
  ) => Promise<TenantUser>;
  deleteUser: (organizationId: string, userId: string) => Promise<boolean>;
  bulkUsers: (
    organizationId: string,
    input: {
      userIds: string[];
      action: 'suspend' | 'activate' | 'delete' | 'set_role';
      customRoleId?: string;
    },
  ) => Promise<{ processed: number }>;
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

function systemRoleFromCustomRoleId(customRoleId?: string): UserRole | undefined {
  if (!customRoleId?.startsWith('system:')) {
    return undefined;
  }
  return customRoleId.slice('system:'.length) as UserRole;
}

export function createHttpRbacApi(): RbacApi {
  return {
    async listRoles() {
      return apiRequest<CustomRole[]>(crmEndpoints.roles);
    },
    async createRole(_organizationId, input) {
      return apiRequest<CustomRole>(crmEndpoints.roles, {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          description: input.description,
          permissions: input.permissions,
        }),
      });
    },
    async updateRole(_organizationId, roleId, patch) {
      return apiRequest<CustomRole>(`${crmEndpoints.roles}/${roleId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
    async deleteRole(_organizationId, roleId) {
      const result = await apiRequest<{ deleted: boolean }>(`${crmEndpoints.roles}/${roleId}`, {
        method: 'DELETE',
      });
      return result.deleted;
    },
    async listCustomPresets() {
      return apiRequest<PermissionPreset[]>(crmEndpoints.permissionPresets);
    },
    async saveCustomPreset(_organizationId, input) {
      return apiRequest<PermissionPreset>(crmEndpoints.permissionPresets, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async deleteCustomPreset(_organizationId, presetId) {
      const result = await apiRequest<{ deleted: boolean }>(
        `${crmEndpoints.permissionPresets}/${presetId}`,
        { method: 'DELETE' },
      );
      return result.deleted;
    },
    async listUsers() {
      return apiRequest<TenantUser[]>(crmEndpoints.users);
    },
    async createUser(_organizationId, input) {
      const systemRole = systemRoleFromCustomRoleId(input.customRoleId) ?? input.systemRole;
      return apiRequest<TenantUser>(crmEndpoints.users, {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          systemRole,
        }),
      });
    },
    async updateUserAcl(_organizationId, userId, patch) {
      return apiRequest<TenantUser>(`${crmEndpoints.users}/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...patch,
          systemRole: systemRoleFromCustomRoleId(patch.customRoleId) ?? patch.systemRole,
        }),
      });
    },
    async updateUserStatus(_organizationId, userId, status) {
      return apiRequest<TenantUser>(`${crmEndpoints.users}/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    async deleteUser(_organizationId, userId) {
      const result = await apiRequest<{ deleted: boolean }>(`${crmEndpoints.users}/${userId}`, {
        method: 'DELETE',
      });
      return result.deleted;
    },
    async bulkUsers(_organizationId, input) {
      return apiRequest<{ processed: number }>(`${crmEndpoints.users}/bulk`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async getRolePermissions(_organizationId, roleId) {
      if (!roleId) {
        return undefined;
      }
      const roles = await apiRequest<CustomRole[]>(crmEndpoints.roles);
      return roles.find((role) => role.id === roleId)?.permissions;
    },
    async listTeams() {
      return apiRequest<OrgTeam[]>(crmEndpoints.teams);
    },
    async createTeam(_organizationId, input) {
      return apiRequest<OrgTeam>(crmEndpoints.teams, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async updateTeam(_organizationId, teamId, patch) {
      return apiRequest<OrgTeam>(`${crmEndpoints.teams}/${teamId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
    async deleteTeam(_organizationId, teamId) {
      const result = await apiRequest<{ deleted: boolean }>(`${crmEndpoints.teams}/${teamId}`, {
        method: 'DELETE',
      });
      return result.deleted;
    },
  };
}

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
    async listCustomPresets(organizationId) {
      return listCustomPresets(organizationId);
    },
    async saveCustomPreset(organizationId, input) {
      return saveCustomPreset(organizationId, input);
    },
    async deleteCustomPreset(organizationId, presetId) {
      return deleteCustomPreset(organizationId, presetId);
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
    async updateUserStatus(organizationId, userId, status) {
      const updated = updateUserAcl(organizationId, userId, {});
      if (!updated) {
        throw new Error('User not found');
      }
      const list = await listUsers(organizationId);
      const user = list.find((item) => item.id === userId);
      if (!user) {
        throw new Error('User not found');
      }
      user.status = status;
      return user;
    },
    async deleteUser(organizationId, userId) {
      const list = await listUsers(organizationId);
      const idx = list.findIndex((item) => item.id === userId);
      if (idx < 0) {
        return false;
      }
      list.splice(idx, 1);
      return true;
    },
    async bulkUsers(organizationId, input) {
      let processed = 0;
      for (const userId of input.userIds) {
        if (input.action === 'delete') {
          const list = await listUsers(organizationId);
          const idx = list.findIndex((item) => item.id === userId);
          if (idx >= 0) {
            list.splice(idx, 1);
            processed += 1;
          }
        } else if (input.action === 'suspend') {
          const list = await listUsers(organizationId);
          const user = list.find((item) => item.id === userId);
          if (user) {
            user.status = 'suspended';
            processed += 1;
          }
        } else if (input.action === 'activate') {
          const list = await listUsers(organizationId);
          const user = list.find((item) => item.id === userId);
          if (user) {
            user.status = 'active';
            processed += 1;
          }
        } else if (input.action === 'set_role' && input.customRoleId) {
          await updateUserAcl(organizationId, userId, {
            customRoleId: input.customRoleId,
            systemRole: systemRoleFromCustomRoleId(input.customRoleId),
          });
          processed += 1;
        }
      }
      return { processed };
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

export const rbacApi = env.useApi ? createHttpRbacApi() : createMockRbacApi();
