import type {
  CreateOrgTeamRequest,
  CreateTenantRequest,
  CreateTenantUserRequest,
  CustomRole,
  Organization,
  OrgTeam,
  Permission,
  PermissionPreset,
  Tenant,
  TenantStatus,
  TenantUser,
  UpdateOrgTeamRequest,
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
  teams: OrgTeam[];
  presetRoleIds: Record<string, string>;
  customPresets: PermissionPreset[];
};

const RBAC_STORAGE_KEY = 'laam:org-rbac-v1';
const hydratedOrgIds = new Set<string>();

type OrgRbacPersist = {
  roles?: CustomRole[];
  customPresets?: PermissionPreset[];
};

function loadOrgRbacPersist(organizationId: string): OrgRbacPersist | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(`${RBAC_STORAGE_KEY}:${organizationId}`);
    return raw ? (JSON.parse(raw) as OrgRbacPersist) : null;
  } catch {
    return null;
  }
}

function persistOrgRbac(organizationId: string, store: OrgStore) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: OrgRbacPersist = {
    roles: store.roles,
    customPresets: store.customPresets,
  };
  localStorage.setItem(`${RBAC_STORAGE_KEY}:${organizationId}`, JSON.stringify(payload));
}

function ensureOrgStoreHydrated(organizationId: string) {
  if (hydratedOrgIds.has(organizationId)) {
    return;
  }

  const store = orgStores.get(organizationId);
  if (!store) {
    return;
  }

  const persisted = loadOrgRbacPersist(organizationId);
  if (persisted?.roles?.length) {
    store.roles = persisted.roles;
  }
  if (persisted?.customPresets?.length) {
    store.customPresets = persisted.customPresets;
  }

  hydratedOrgIds.add(organizationId);
}

function touchOrgStore(organizationId: string) {
  const store = orgStores.get(organizationId);
  if (store) {
    persistOrgRbac(organizationId, store);
  }
}

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
      phone: '01700000001',
      systemRole: 'org_admin',
      customRoleId: presetRoleIds.preset_org_admin,
      permissionGrants: [],
      permissionDenies: [],
      status: 'active',
      lastSeenAt: '2026-07-02T09:00:00Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000011',
      organizationId,
      name: 'Sakib Ahmed',
      email: 'sakib@laamcrm.com',
      phone: '01711223344',
      systemRole: 'sales_rep',
      customRoleId: presetRoleIds.preset_sales_agent,
      permissionGrants: [],
      permissionDenies: [],
      status: 'active',
      lastSeenAt: '2026-07-02T08:30:00Z',
      orderDistributionPercent: 30,
      teamId: 'team-alpha',
    },
    {
      id: '00000000-0000-4000-8000-000000000012',
      organizationId,
      name: 'Mitu Rahman',
      email: 'mitu@laamcrm.com',
      phone: '01822334455',
      systemRole: 'team_leader',
      customRoleId: presetRoleIds.preset_team_leader,
      permissionGrants: [],
      permissionDenies: [],
      status: 'active',
      lastSeenAt: '2026-07-01T17:00:00Z',
      orderDistributionPercent: 25,
      teamId: 'team-alpha',
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
      status: 'active',
      lastSeenAt: '2026-06-30T14:00:00Z',
      orderDistributionPercent: 20,
    },
    {
      id: '00000000-0000-4000-8000-000000000014',
      organizationId,
      name: 'Nadia Islam',
      email: 'nadia@laamcrm.com',
      phone: '01933445566',
      systemRole: 'sales_rep',
      customRoleId: presetRoleIds.preset_sales_agent,
      permissionGrants: [],
      permissionDenies: [],
      status: 'active',
      orderDistributionPercent: 25,
      teamId: 'team-alpha',
    },
    {
      id: '00000000-0000-4000-8000-000000000015',
      organizationId,
      name: 'Karim Hassan',
      email: 'karim@laamcrm.com',
      phone: '01644556677',
      systemRole: 'team_leader',
      customRoleId: presetRoleIds.preset_team_leader,
      permissionGrants: [],
      permissionDenies: [],
      status: 'active',
      lastSeenAt: '2026-07-02T10:00:00Z',
      teamId: 'team-beta',
    },
    {
      id: '00000000-0000-4000-8000-000000000016',
      organizationId,
      name: 'Rina Akter',
      email: 'rina@laamcrm.com',
      phone: '01555667788',
      systemRole: 'sales_rep',
      customRoleId: presetRoleIds.preset_sales_agent,
      permissionGrants: [],
      permissionDenies: [],
      status: 'active',
      teamId: 'team-beta',
    },
    {
      id: '00000000-0000-4000-8000-000000000017',
      organizationId,
      name: 'Tariq Islam',
      email: 'tariq@laamcrm.com',
      phone: '01366778899',
      systemRole: 'sales_rep',
      customRoleId: presetRoleIds.preset_sales_agent,
      permissionGrants: [],
      permissionDenies: [],
      status: 'active',
      teamId: 'team-beta',
    },
  ];
}

function buildLaamSeedTeams(organizationId: string): OrgTeam[] {
  return [
    {
      id: 'team-alpha',
      organizationId,
      name: 'Call Team Alpha',
      leaderUserId: '00000000-0000-4000-8000-000000000012',
      memberUserIds: [
        '00000000-0000-4000-8000-000000000011',
        '00000000-0000-4000-8000-000000000014',
      ],
      createdAt: '2026-01-15T00:00:00.000Z',
    },
    {
      id: 'team-beta',
      organizationId,
      name: 'Call Team Beta',
      leaderUserId: '00000000-0000-4000-8000-000000000015',
      memberUserIds: [
        '00000000-0000-4000-8000-000000000016',
        '00000000-0000-4000-8000-000000000017',
      ],
      createdAt: '2026-02-01T00:00:00.000Z',
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
      teams: buildLaamSeedTeams(laamOrgId),
      presetRoleIds: laamBootstrap.presetRoleIds,
      customPresets: [],
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

export function updateTenantStatus(tenantId: string, status: TenantStatus): Tenant {
  const index = tenants.findIndex((tenant) => tenant.id === tenantId);
  if (index === -1) {
    throw new Error('Tenant not found');
  }

  tenants[index] = { ...tenants[index], status };
  return tenants[index];
}

export function deleteTenant(tenantId: string): boolean {
  const index = tenants.findIndex((tenant) => tenant.id === tenantId);
  if (index === -1) {
    return false;
  }

  tenants = tenants.filter((tenant) => tenant.id !== tenantId);
  orgStores.delete(tenantId);
  return true;
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
    status: 'active',
  };

  const tenant: Tenant = {
    id: organizationId,
    name: input.name,
    slug: input.slug,
    plan: input.plan,
    status: 'active',
    phone: input.owner.phone ?? null,
    ownerUserId,
    createdAt: new Date().toISOString(),
  };

  orgStores.set(organizationId, {
    organization,
    roles,
    users: [owner],
    teams: [],
    presetRoleIds,
    customPresets: [],
  });

  tenants = [tenant, ...tenants];
  return tenant;
}

export function listRoles(organizationId: string): CustomRole[] {
  ensureOrgStoreHydrated(organizationId);
  return [...(orgStores.get(organizationId)?.roles ?? [])];
}

export function listCustomPresets(organizationId: string): PermissionPreset[] {
  ensureOrgStoreHydrated(organizationId);
  return [...(orgStores.get(organizationId)?.customPresets ?? [])];
}

export function saveCustomPreset(
  organizationId: string,
  input: { name: string; description?: string; permissions: Permission[] },
): PermissionPreset {
  ensureOrgStoreHydrated(organizationId);
  const store = orgStores.get(organizationId);
  if (!store) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  const preset: PermissionPreset = {
    id: `custom_${crypto.randomUUID()}`,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    permissions: [...input.permissions],
  };

  store.customPresets = [...store.customPresets, preset];
  touchOrgStore(organizationId);
  return preset;
}

export function deleteCustomPreset(organizationId: string, presetId: string): boolean {
  ensureOrgStoreHydrated(organizationId);
  const store = orgStores.get(organizationId);
  if (!store) {
    return false;
  }

  const next = store.customPresets.filter((preset) => preset.id !== presetId);
  if (next.length === store.customPresets.length) {
    return false;
  }

  store.customPresets = next;
  touchOrgStore(organizationId);
  return true;
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

  const role = getRole(organizationId, roleId);
  if (!role) {
    return undefined;
  }

  // System roles always resolve from current preset catalog (picks up new permissions).
  if (role.isSystem) {
    const preset = PERMISSION_PRESETS.find((p) => p.name === role.name);
    if (preset) {
      return [...preset.permissions];
    }
  }

  return role.permissions;
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
  touchOrgStore(organizationId);
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

  const next = { ...store.roles[index], ...patch, updatedAt: new Date().toISOString() };
  store.roles = [...store.roles.slice(0, index), next, ...store.roles.slice(index + 1)];
  touchOrgStore(organizationId);
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
  touchOrgStore(organizationId);
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
    status: 'invited',
  };

  store.users = [...store.users, user];
  return user;
}

export function updateUserAcl(
  organizationId: string,
  userId: string,
  patch: UpdateTenantUserAcl,
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
    systemRole: patch.systemRole ?? current.systemRole,
    teamId: patch.teamId === undefined ? current.teamId : patch.teamId ?? undefined,
    permissionGrants: patch.permissionGrants ?? current.permissionGrants,
    permissionDenies: patch.permissionDenies ?? current.permissionDenies,
  };

  store.users = [...store.users.slice(0, index), next, ...store.users.slice(index + 1)];
  return next;
}

export function listTeams(organizationId: string): OrgTeam[] {
  return [...(orgStores.get(organizationId)?.teams ?? [])];
}

export function getTeam(organizationId: string, teamId: string): OrgTeam | undefined {
  return orgStores.get(organizationId)?.teams.find((t) => t.id === teamId);
}

function syncUserTeamLinks(
  store: OrgStore,
  teamId: string,
  leaderUserId: string,
  memberUserIds: string[],
) {
  const memberSet = new Set(memberUserIds);
  store.users = store.users.map((user) => {
    if (user.id === leaderUserId) {
      return {
        ...user,
        teamId,
        systemRole: user.systemRole === 'org_admin' || user.systemRole === 'sales_manager'
          ? user.systemRole
          : 'team_leader',
        customRoleId:
          user.systemRole === 'org_admin' || user.systemRole === 'sales_manager'
            ? user.customRoleId
            : store.presetRoleIds.preset_team_leader ?? user.customRoleId,
      };
    }
    if (memberSet.has(user.id)) {
      return {
        ...user,
        teamId,
        systemRole: user.systemRole === 'team_leader' ? 'sales_rep' : user.systemRole,
        customRoleId:
          user.systemRole === 'team_leader'
            ? store.presetRoleIds.preset_sales_agent ?? user.customRoleId
            : user.customRoleId,
      };
    }
    if (user.teamId === teamId) {
      return { ...user, teamId: undefined };
    }
    return user;
  });
}

export function createTeam(
  organizationId: string,
  input: CreateOrgTeamRequest,
): OrgTeam {
  const store = orgStores.get(organizationId);
  if (!store) throw new Error(`Organization not found: ${organizationId}`);

  const members = input.memberUserIds.filter((id) => id !== input.leaderUserId);
  const team: OrgTeam = {
    id: `team-${crypto.randomUUID().slice(0, 8)}`,
    organizationId,
    name: input.name.trim(),
    leaderUserId: input.leaderUserId,
    memberUserIds: members,
    createdAt: new Date().toISOString(),
  };

  store.teams = [...store.teams, team];
  syncUserTeamLinks(store, team.id, team.leaderUserId, team.memberUserIds);
  return team;
}

export function updateTeam(
  organizationId: string,
  teamId: string,
  patch: UpdateOrgTeamRequest,
): OrgTeam | undefined {
  const store = orgStores.get(organizationId);
  if (!store) return undefined;

  const index = store.teams.findIndex((t) => t.id === teamId);
  if (index === -1) return undefined;

  const current = store.teams[index];
  const leaderUserId = patch.leaderUserId ?? current.leaderUserId;
  const memberUserIds = (patch.memberUserIds ?? current.memberUserIds).filter(
    (id) => id !== leaderUserId,
  );

  const next: OrgTeam = {
    ...current,
    name: patch.name?.trim() ?? current.name,
    leaderUserId,
    memberUserIds,
  };

  store.teams = [...store.teams.slice(0, index), next, ...store.teams.slice(index + 1)];
  syncUserTeamLinks(store, teamId, leaderUserId, memberUserIds);
  return next;
}

export function deleteTeam(organizationId: string, teamId: string): boolean {
  const store = orgStores.get(organizationId);
  if (!store) return false;
  const exists = store.teams.some((t) => t.id === teamId);
  if (!exists) return false;
  store.teams = store.teams.filter((t) => t.id !== teamId);
  store.users = store.users.map((u) =>
    u.teamId === teamId ? { ...u, teamId: undefined } : u,
  );
  return true;
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
