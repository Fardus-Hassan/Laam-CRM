import { z } from 'zod';

/** All granular permissions — `{resource}.{action}` */
export const PERMISSION_CATALOG = [
  'dashboard.view',
  'dashboard.widget.revenue',
  'dashboard.widget.orders',
  'dashboard.widget.leads',
  'dashboard.widget.team',
  'dashboard.widget.marketing',
  'dashboard.widget.platform',
  'contacts.view',
  'contacts.create',
  'contacts.edit',
  'contacts.delete',
  'companies.view',
  'companies.create',
  'companies.edit',
  'companies.delete',
  'leads.view',
  'leads.create',
  'leads.edit',
  'leads.assign',
  'leads.convert',
  'leads.export',
  'orders.view',
  'orders.create',
  'orders.confirm',
  'orders.cancel',
  'orders.assign',
  'orders.export',
  'campaigns.view',
  'campaigns.create',
  'campaigns.edit',
  'campaigns.manage_budget',
  'tasks.view',
  'tasks.create',
  'tasks.edit',
  'tasks.assign',
  'activities.view',
  'activities.create',
  'activities.edit',
  'reports.view',
  'reports.export',
  'users.view',
  'users.invite',
  'users.manage',
  'roles.view',
  'roles.manage',
  'settings.view',
  'settings.manage',
  'platform.view',
  'platform.manage',
  'permissions.manage',
] as const;

export const permissionSchema = z.enum(PERMISSION_CATALOG);
export type Permission = z.infer<typeof permissionSchema>;

export const PERMISSIONS: Permission[] = [...PERMISSION_CATALOG];

export type PermissionGroup = {
  id: string;
  label: string;
  permissions: Permission[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    permissions: [
      'dashboard.view',
      'dashboard.widget.revenue',
      'dashboard.widget.orders',
      'dashboard.widget.leads',
      'dashboard.widget.team',
      'dashboard.widget.marketing',
      'dashboard.widget.platform',
    ],
  },
  {
    id: 'leads',
    label: 'Leads',
    permissions: [
      'leads.view',
      'leads.create',
      'leads.edit',
      'leads.assign',
      'leads.convert',
      'leads.export',
    ],
  },
  {
    id: 'orders',
    label: 'Orders',
    permissions: [
      'orders.view',
      'orders.create',
      'orders.confirm',
      'orders.cancel',
      'orders.assign',
      'orders.export',
    ],
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    permissions: [
      'campaigns.view',
      'campaigns.create',
      'campaigns.edit',
      'campaigns.manage_budget',
    ],
  },
  {
    id: 'contacts',
    label: 'Contacts',
    permissions: [
      'contacts.view',
      'contacts.create',
      'contacts.edit',
      'contacts.delete',
    ],
  },
  {
    id: 'companies',
    label: 'Customers',
    permissions: [
      'companies.view',
      'companies.create',
      'companies.edit',
      'companies.delete',
    ],
  },
  {
    id: 'work',
    label: 'Work',
    permissions: [
      'tasks.view',
      'tasks.create',
      'tasks.edit',
      'tasks.assign',
      'activities.view',
      'activities.create',
      'activities.edit',
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    permissions: ['reports.view', 'reports.export'],
  },
  {
    id: 'admin',
    label: 'Administration',
    permissions: [
      'users.view',
      'users.invite',
      'users.manage',
      'roles.view',
      'roles.manage',
      'settings.view',
      'settings.manage',
      'permissions.manage',
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    permissions: ['platform.view', 'platform.manage'],
  },
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  'dashboard.view': 'View dashboard',
  'dashboard.widget.revenue': 'Revenue widgets',
  'dashboard.widget.orders': 'Order widgets',
  'dashboard.widget.leads': 'Lead widgets',
  'dashboard.widget.team': 'Team widgets',
  'dashboard.widget.marketing': 'Marketing widgets',
  'dashboard.widget.platform': 'Platform widgets',
  'contacts.view': 'View contacts',
  'contacts.create': 'Create contacts',
  'contacts.edit': 'Edit contacts',
  'contacts.delete': 'Delete contacts',
  'companies.view': 'View customers',
  'companies.create': 'Create customers',
  'companies.edit': 'Edit customers',
  'companies.delete': 'Delete customers',
  'leads.view': 'View leads',
  'leads.create': 'Create leads',
  'leads.edit': 'Edit leads',
  'leads.assign': 'Assign leads',
  'leads.convert': 'Convert leads',
  'leads.export': 'Export leads',
  'orders.view': 'View orders',
  'orders.create': 'Create orders',
  'orders.confirm': 'Confirm orders',
  'orders.cancel': 'Cancel orders',
  'orders.assign': 'Assign orders',
  'orders.export': 'Export orders',
  'campaigns.view': 'View campaigns',
  'campaigns.create': 'Create campaigns',
  'campaigns.edit': 'Edit campaigns',
  'campaigns.manage_budget': 'Manage ad budget',
  'tasks.view': 'View tasks',
  'tasks.create': 'Create tasks',
  'tasks.edit': 'Edit tasks',
  'tasks.assign': 'Assign tasks',
  'activities.view': 'View follow ups',
  'activities.create': 'Log follow ups',
  'activities.edit': 'Edit follow ups',
  'reports.view': 'View reports',
  'reports.export': 'Export reports',
  'users.view': 'View team',
  'users.invite': 'Invite users',
  'users.manage': 'Manage users',
  'roles.view': 'View roles',
  'roles.manage': 'Manage roles',
  'settings.view': 'View settings',
  'settings.manage': 'Manage settings',
  'platform.view': 'View platform',
  'platform.manage': 'Manage platform',
  'permissions.manage': 'Manage permissions',
};

export function isValidPermission(value: string): value is Permission {
  return PERMISSIONS.includes(value as Permission);
}

/** All tenant-scoped permissions (excludes platform-only). */
export const TENANT_PERMISSIONS: Permission[] = PERMISSIONS.filter(
  (p) => !p.startsWith('platform.'),
);
