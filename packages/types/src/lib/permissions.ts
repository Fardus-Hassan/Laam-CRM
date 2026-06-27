import { z } from 'zod';
import type { UserRole } from './roles.js';

export const permissionSchema = z.enum([
  'dashboard.view',
  'contacts.view',
  'companies.view',
  'leads.view',
  'deals.view',
  'pipeline.view',
  'tasks.view',
  'activities.view',
  'reports.view',
  'users.manage',
  'settings.manage',
  'platform.manage',
]);

export type Permission = z.infer<typeof permissionSchema>;

export const PERMISSIONS = permissionSchema.options;

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  super_admin: [
    'dashboard.view',
    'reports.view',
    'users.manage',
    'platform.manage',
  ],
  org_admin: [
    'dashboard.view',
    'contacts.view',
    'companies.view',
    'leads.view',
    'deals.view',
    'pipeline.view',
    'tasks.view',
    'activities.view',
    'reports.view',
    'users.manage',
    'settings.manage',
  ],
  ceo: [
    'dashboard.view',
    'contacts.view',
    'companies.view',
    'leads.view',
    'deals.view',
    'pipeline.view',
    'tasks.view',
    'activities.view',
    'reports.view',
    'users.manage',
    'settings.manage',
  ],
  team_leader: [
    'dashboard.view',
    'contacts.view',
    'leads.view',
    'deals.view',
    'pipeline.view',
    'tasks.view',
    'activities.view',
    'reports.view',
  ],
  sales_manager: [
    'dashboard.view',
    'contacts.view',
    'companies.view',
    'leads.view',
    'deals.view',
    'pipeline.view',
    'tasks.view',
    'activities.view',
    'reports.view',
  ],
  sales_rep: [
    'dashboard.view',
    'contacts.view',
    'companies.view',
    'leads.view',
    'deals.view',
    'pipeline.view',
    'tasks.view',
    'activities.view',
  ],
  marketing_head: [
    'dashboard.view',
    'leads.view',
    'contacts.view',
    'activities.view',
    'reports.view',
    'tasks.view',
  ],
  support_agent: [
    'dashboard.view',
    'contacts.view',
    'tasks.view',
    'activities.view',
  ],
  finance: ['dashboard.view', 'tasks.view', 'reports.view'],
  viewer: ['dashboard.view'],
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function resolveUserPermissions(
  user: { role: UserRole; permissions?: string[] | undefined },
): Permission[] {
  if (user.permissions?.length) {
    return user.permissions.filter(
      (permission): permission is Permission =>
        PERMISSIONS.includes(permission as Permission),
    );
  }

  return getPermissionsForRole(user.role);
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
