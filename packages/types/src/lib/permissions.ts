import type { UserRole } from './roles.js';
import {
  isValidPermission,
  PERMISSIONS,
  permissionSchema,
  type Permission,
  TENANT_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
} from './permission-catalog.js';

export {
  permissionSchema,
  PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  TENANT_PERMISSIONS,
  isValidPermission,
  type Permission,
};

export type UserPermissionInput = {
  role: UserRole;
  /** Permissions from assigned custom role (tenant). */
  customRolePermissions?: readonly Permission[];
  /** Extra grants on top of role. */
  permissionGrants?: readonly string[];
  /** Explicit denies (wins over grants). */
  permissionDenies?: readonly string[];
  /** @deprecated Use permissionGrants — kept for backward compatibility. */
  permissions?: readonly string[];
};

/** Preset permission sets for system/demo roles. */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  super_admin: [
    'dashboard.view',
    'dashboard.widget.platform',
    'reports.view',
    'reports.export',
    'users.view',
    'users.manage',
    'platform.view',
    'platform.manage',
    'roles.view',
    'roles.manage',
    'permissions.manage',
  ],
  org_admin: [...TENANT_PERMISSIONS],
  ceo: [
    'dashboard.view',
    'dashboard.widget.revenue',
    'dashboard.widget.orders',
    'dashboard.widget.leads',
    'dashboard.widget.team',
    'dashboard.widget.marketing',
    'contacts.view',
    'companies.view',
    'leads.view',
    'leads.export',
    'orders.view',
    'orders.export',
    'campaigns.view',
    'tasks.view',
    'activities.view',
    'reports.view',
    'reports.export',
    'users.view',
    'users.manage',
    'roles.view',
    'settings.view',
    'settings.manage',
  ],
  team_leader: [
    'dashboard.view',
    'dashboard.widget.orders',
    'dashboard.widget.leads',
    'dashboard.widget.team',
    'contacts.view',
    'leads.view',
    'leads.assign',
    'orders.view',
    'orders.assign',
    'orders.confirm',
    'tasks.view',
    'tasks.assign',
    'activities.view',
    'activities.create',
    'reports.view',
  ],
  sales_manager: [
    'dashboard.view',
    'dashboard.widget.revenue',
    'dashboard.widget.orders',
    'dashboard.widget.leads',
    'dashboard.widget.team',
    'contacts.view',
    'contacts.create',
    'companies.view',
    'leads.view',
    'leads.create',
    'leads.assign',
    'leads.export',
    'orders.view',
    'orders.create',
    'orders.confirm',
    'orders.cancel',
    'orders.assign',
    'orders.export',
    'tasks.view',
    'tasks.create',
    'activities.view',
    'activities.create',
    'reports.view',
    'reports.export',
  ],
  sales_rep: [
    'dashboard.view',
    'dashboard.widget.orders',
    'dashboard.widget.leads',
    'contacts.view',
    'leads.view',
    'leads.create',
    'leads.convert',
    'orders.view',
    'orders.create',
    'orders.confirm',
    'tasks.view',
    'tasks.create',
    'activities.view',
    'activities.create',
  ],
  marketing_head: [
    'dashboard.view',
    'dashboard.widget.leads',
    'dashboard.widget.marketing',
    'leads.view',
    'leads.create',
    'leads.assign',
    'leads.export',
    'contacts.view',
    'contacts.create',
    'campaigns.view',
    'campaigns.create',
    'campaigns.edit',
    'campaigns.manage_budget',
    'activities.view',
    'activities.create',
    'reports.view',
    'reports.export',
    'tasks.view',
    'tasks.create',
  ],
  support_agent: [
    'dashboard.view',
    'dashboard.widget.orders',
    'contacts.view',
    'contacts.edit',
    'orders.view',
    'orders.cancel',
    'tasks.view',
    'tasks.create',
    'activities.view',
    'activities.create',
  ],
  finance: [
    'dashboard.view',
    'dashboard.widget.revenue',
    'dashboard.widget.orders',
    'orders.view',
    'orders.export',
    'reports.view',
    'reports.export',
    'tasks.view',
  ],
  viewer: ['dashboard.view', 'reports.view'],
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

function normalizePermissionList(values: readonly string[] | undefined): Permission[] {
  if (!values?.length) {
    return [];
  }

  return values.filter(isValidPermission);
}

/**
 * Effective permissions: (customRole | presetRole) ∪ grants − denies
 */
export function resolveUserPermissions(user: UserPermissionInput): Permission[] {
  const base =
    user.customRolePermissions?.length
      ? [...user.customRolePermissions]
      : getPermissionsForRole(user.role);

  const grants = normalizePermissionList([
    ...(user.permissionGrants ?? []),
    ...(user.permissions ?? []),
  ]);
  const denies = new Set(normalizePermissionList(user.permissionDenies));

  const effective = new Set<Permission>(base);
  for (const grant of grants) {
    effective.add(grant);
  }
  for (const deny of denies) {
    effective.delete(deny);
  }

  return [...effective];
}

export function hasPermission(
  userPermissions: readonly Permission[],
  required: Permission | Permission[],
  match: 'any' | 'all' = 'any',
): boolean {
  const requiredList = Array.isArray(required) ? required : [required];

  if (match === 'all') {
    return requiredList.every((permission) => userPermissions.includes(permission));
  }

  return requiredList.some((permission) => userPermissions.includes(permission));
}

export function hasAllTenantPermissions(userPermissions: readonly Permission[]): boolean {
  return TENANT_PERMISSIONS.every((p) => userPermissions.includes(p));
}
