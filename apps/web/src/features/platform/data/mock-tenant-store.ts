import type {
  CreateTenantRequest,
  CreateTenantUserRequest,
  CustomRole,
  Organization,
  Permission,
  PermissionPreset,
  Tenant,
  TenantUser,
  UpdateTenantUserAcl,
  UserRole,
} from '@laam/types';
import {
  ROLE_DASHBOARD_TEMPLATE,
  ROLE_PERMISSIONS,
} from '@laam/types';

import { MOCK_ORGANIZATION } from '@/features/auth/mocks/mock-organization';

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: 'preset_sales_agent',
    name: 'Sales Agent',
    description: 'Call center agent — leads, orders, follow-ups',
    permissions: [...ROLE_PERMISSIONS.sales_rep],
    dashboardTemplate: ROLE_DASHBOARD_TEMPLATE.sales_rep,
  },
  {
    id: 'preset_team_leader',
    name: 'Team Leader',
    description: 'Manages team leads and orders',
    permissions: [...ROLE_PERMISSIONS.team_leader],
    dashboardTemplate: ROLE_DASHBOARD_TEMPLATE.team_leader,
  },
  {
    id: 'preset_sales_head',
    name: 'Sales Head',
    description: 'Sales office manager',
    permissions: [...ROLE_PERMISSIONS.sales_manager],
    dashboardTemplate: ROLE_DASHBOARD_TEMPLATE.sales_manager,
  },
  {
    id: 'preset_marketing_head',
    name: 'Marketing Head',
    description: 'Facebook ads and lead generation',
    permissions: [...ROLE_PERMISSIONS.marketing_head],
    dashboardTemplate: ROLE_DASHBOARD_TEMPLATE.marketing_head,
  },
  {
    id: 'preset_ceo',
    name: 'CEO / Executive',
    description: 'Executive overview',
    permissions: [...ROLE_PERMISSIONS.ceo],
    dashboardTemplate: ROLE_DASHBOARD_TEMPLATE.ceo,
  },
  {
    id: 'preset_org_admin',
    name: 'Org Admin',
    description: 'Full organization access',
    permissions: [...ROLE_PERMISSIONS.org_admin],
    dashboardTemplate: ROLE_DASHBOARD_TEMPLATE.org_admin,
  },
];

type OrgStore = {
  organization: Organization;
  roles: CustomRole[];
  users: TenantUser[];
  presetRoleIds: Record<string, string>;
};

function buildDefaultRoles(organizationId: string): {
  roles: CustomRole[];
  presetRoleIds: Record<string, string>;
} {
  const presetRoleIds: Record<string, string> = {};
  const roles = PERMISSION_PRESETS.map((preset) => {
    const id = crypto.randomUUID();
    presetRoleIds[preset.id] = id;

    return {
      id,
      organizationId,
      name: preset.name,
      description: preset.description,
      permissions: [...preset.permissions],
      dashboardTemplate: preset.dashboardTemplate,
      isSystem: true,
    };
  });

  return { roles, presetRoleIds };
}

function buildLaamSeedUsers(
  organizationId: string,
  presetRoleIds: Record<string, string>,
): TenantUser[] {
  return [
    {
      id: '00000000-0000-4000-8000-000000000010',
      organizationId,
      name: 'Laam Org Admin',
      email: 'admin@laam.com',
      systemRole: 'org_admin',
      customRoleId: presetRoleIds.preset_org_admin,
      permissionGrants: [],
      permissionDenies: [],
    },
    {
      id: '00000000-0000-4000-8000-000000000011',
      organizationId,
      name: 'Sakib Ahmed',
      email: 'sakib@laamcrm.com',
      systemRole: 'sales_rep',
      customRoleId: presetRoleIds.preset_sales_agent,
      permissionGrants: [],
      permissionDenies: [],
    },
    {
      id: '00000000-0000-4000-8000-000000000012',
      organizationId,
      name: 'Mitu Rahman',
      email: 'mitu@laamcrm.com',
      systemRole: 'team_leader',
      customRoleId: presetRoleIds.preset_team_leader,
      permissionGrants: [],
      permissionDenies: [],
    },
    {
      id: '00000000-0000-4000-8000-000000000013',
      organizationId,
      name: 'Imran Hossain',
      email: 'imran@laamcrm.com',
      systemRole: 'sales_manager',
      customRoleId: presetRoleIds.preset_sales_head,
      permissionGrants: ['reports.export'],
      permissionDenies: [],
    },
  ];
}

const laamOrgId = MOCK_ORGANIZATION.id;
const laamBootstrap = buildDefaultRoles(laamOrgId);

let tenants: Tenant[] = [
  {
    id: laamOrgId,
    name: MOCK_ORGANIZATION.name,
    slug: MOCK_ORGANIZATION.slug,
    plan: 'Enterprise',
    status: 'active',
    ownerUserId: '00000000-0000-4000-8000-000000000010',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

const orgStores = new Map<string, OrgStore>([
  [
    laamOrgId,
    {
      organization: { ...MOCK_ORGANIZATION },
      roles: laamBootstrap.roles,
      users: buildLaamSeedUsers(laamOrgId, laamBootstrap.presetRoleIds),
      presetRoleIds: laamBootstrap.presetRoleIds,
    },
  ],
]);

export function getPresetById(id: string): PermissionPreset | undefined {
  return PERMISSION_PRESETS.find((preset) => preset.id === id);
}

export function listTenants(): Tenant[] {
  return [...tenants].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function getTenant(id: string): Tenant | undefined {
  return tenants.find((tenant) => tenant.id === id);
}

export function getOrganization(id: string): Organization | undefined {
  return orgStores.get(id)?.organization;
}

export function getTenantOwner(tenantId: string): TenantUser | undefined {
  const tenant = getTenant(tenantId);
  if (!tenant) {
    return undefined;
  }

  return orgStores.get(tenantId)?.users.find((user) => user.id === tenant.ownerUserId);
}

export function createTenant(input: CreateTenantRequest): Tenant {
  const organizationId = crypto.randomUUID();
  const ownerUserId = crypto.randomUUID();
  const { roles, presetRoleIds } = buildDefaultRoles(organizationId);
  const orgAdminRoleId = presetRoleIds.preset_org_admin;

  const organization: Organization = {
    id: organizationId,
    name: input.name,
    plan: input.plan,
    slug: input.slug,
  };

  const owner: TenantUser = {
    id: ownerUserId,
    organizationId,
    name: input.owner.name,
    email: input.owner.email,
    systemRole: 'org_admin',
    customRoleId: orgAdminRoleId,
    permissionGrants: [],
    permissionDenies: [],
  };

  const tenant: Tenant = {
    id: organizationId,
    name: input.name,
    slug: input.slug,
    plan: input.plan,
    status: 'active',
    ownerUserId,
    createdAt: new Date().toISOString(),
  };

  orgStores.set(organizationId, {
    organization,
    roles,
    users: [owner],
    presetRoleIds,
  });

  tenants = [tenant, ...tenants];
  return tenant;
}

export function listRoles(organizationId: string): CustomRole[] {
  return [...(orgStores.get(organizationId)?.roles ?? [])];
}

export function getRole(organizationId: string, roleId: string): CustomRole | undefined {
  return orgStores.get(organizationId)?.roles.find((role) => role.id === roleId);
}

export function getRolePermissions(
  organizationId: string,
  roleId: string | undefined,
): Permission[] | undefined {
  if (!roleId) {
    return undefined;
  }

  return getRole(organizationId, roleId)?.permissions;
}

export function createRole(
  organizationId: string,
  input: {
    name: string;
    description?: string;
    permissions: Permission[];
    dashboardTemplate?: CustomRole['dashboardTemplate'];
    presetId?: string;
  },
): CustomRole {
  const store = orgStores.get(organizationId);
  if (!store) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  const preset = input.presetId ? getPresetById(input.presetId) : undefined;
  const role: CustomRole = {
    id: crypto.randomUUID(),
    organizationId,
    name: input.name,
    description: input.description ?? preset?.description,
    permissions: input.permissions.length ? input.permissions : [...(preset?.permissions ?? [])],
    dashboardTemplate: input.dashboardTemplate ?? preset?.dashboardTemplate,
    isSystem: false,
  };

  store.roles = [...store.roles, role];
  return role;
}

export function updateRole(
  organizationId: string,
  roleId: string,
  patch: Partial<Pick<CustomRole, 'name' | 'description' | 'permissions' | 'dashboardTemplate'>>,
): CustomRole | undefined {
  const store = orgStores.get(organizationId);
  if (!store) {
    return undefined;
  }

  const index = store.roles.findIndex((role) => role.id === roleId);
  if (index === -1) {
    return undefined;
  }

  const next = { ...store.roles[index], ...patch };
  store.roles = [...store.roles.slice(0, index), next, ...store.roles.slice(index + 1)];
  return next;
}

export function deleteRole(organizationId: string, roleId: string): boolean {
  const store = orgStores.get(organizationId);
  if (!store) {
    return false;
  }

  const role = store.roles.find((item) => item.id === roleId);
  if (!role || role.isSystem) {
    return false;
  }

  store.roles = store.roles.filter((item) => item.id !== roleId);
  return true;
}

export function listUsers(organizationId: string): TenantUser[] {
  return [...(orgStores.get(organizationId)?.users ?? [])];
}

export function getUser(organizationId: string, userId: string): TenantUser | undefined {
  return orgStores.get(organizationId)?.users.find((user) => user.id === userId);
}

export function createUser(
  organizationId: string,
  input: CreateTenantUserRequest,
): TenantUser {
  const store = orgStores.get(organizationId);
  if (!store) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  const user: TenantUser = {
    id: crypto.randomUUID(),
    organizationId,
    name: input.name,
    email: input.email,
    systemRole: input.systemRole,
    customRoleId: input.customRoleId,
    permissionGrants: [...input.permissionGrants],
    permissionDenies: [...input.permissionDenies],
  };

  store.users = [...store.users, user];
  return user;
}

export function updateUserAcl(
  organizationId: string,
  userId: string,
  patch: UpdateTenantUserAcl & { customRoleId?: string },
): TenantUser | undefined {
  const store = orgStores.get(organizationId);
  if (!store) {
    return undefined;
  }

  const index = store.users.findIndex((user) => user.id === userId);
  if (index === -1) {
    return undefined;
  }

  const current = store.users[index];
  const next: TenantUser = {
    ...current,
    customRoleId: patch.customRoleId ?? current.customRoleId,
    permissionGrants: patch.permissionGrants ?? current.permissionGrants,
    permissionDenies: patch.permissionDenies ?? current.permissionDenies,
  };

  store.users = [...store.users.slice(0, index), next, ...store.users.slice(index + 1)];
  return next;
}

export function getDemoCustomRoleIdForUserRole(
  organizationId: string,
  role: UserRole,
): string | undefined {
  const presetRoleIds = orgStores.get(organizationId)?.presetRoleIds;
  if (!presetRoleIds) {
    return undefined;
  }

  const map: Partial<Record<UserRole, string>> = {
    org_admin: presetRoleIds.preset_org_admin,
    sales_rep: presetRoleIds.preset_sales_agent,
    team_leader: presetRoleIds.preset_team_leader,
    sales_manager: presetRoleIds.preset_sales_head,
    marketing_head: presetRoleIds.preset_marketing_head,
    ceo: presetRoleIds.preset_ceo,
  };

  return map[role];
}
