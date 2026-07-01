import type { CrmModuleId, Permission } from '@laam/types';

export type CrmModuleDefinition = {
  id: CrmModuleId;
  title: string;
  description: string;
  permissions: Permission[];
  /** Future API resource path segment, e.g. `/crm/contacts`. */
  apiPath: string;
};

export const CRM_MODULES = {
  contacts: {
    id: 'contacts',
    title: 'Contacts',
    description: 'Manage people and communication history across your organization.',
    permissions: ['contacts.view'],
    apiPath: '/crm/contacts',
  },
  companies: {
    id: 'companies',
    title: 'Customers',
    description: 'Everyday buyers — mobile lookup, order history, and repeat purchase tracking.',
    permissions: ['companies.view'],
    apiPath: '/crm/companies',
  },
  leads: {
    id: 'leads',
    title: 'Leads',
    description: 'Pre-orders from Facebook, calls, and walk-ins — convert to confirmed orders.',
    permissions: ['leads.view'],
    apiPath: '/crm/leads',
  },
  orders: {
    id: 'orders',
    title: 'Orders',
    description: 'Manage confirmed, pending, and delivered customer orders.',
    permissions: ['orders.view'],
    apiPath: '/crm/orders',
  },
  campaigns: {
    id: 'campaigns',
    title: 'Campaigns',
    description: 'Track Facebook ads, budgets, and landing page performance.',
    permissions: ['campaigns.view'],
    apiPath: '/crm/campaigns',
  },
  deals: {
    id: 'deals',
    title: 'Deals',
    description: 'Monitor deal stages, amounts, and close dates.',
    permissions: ['deals.view'],
    apiPath: '/crm/deals',
  },
  pipeline: {
    id: 'pipeline',
    title: 'Pipeline',
    description: 'Visualize your sales funnel and forecast revenue.',
    permissions: ['pipeline.view'],
    apiPath: '/crm/pipeline',
  },
  tasks: {
    id: 'tasks',
    title: 'Tasks',
    description: 'Assign follow-ups and track team productivity.',
    permissions: ['tasks.view'],
    apiPath: '/crm/tasks',
  },
  activities: {
    id: 'activities',
    title: 'Follow Ups',
    description: 'Calls, emails, meetings, and notes in one timeline.',
    permissions: ['activities.view'],
    apiPath: '/crm/activities',
  },
  reports: {
    id: 'reports',
    title: 'Reports',
    description: 'Analytics for sales performance and revenue trends.',
    permissions: ['reports.view'],
    apiPath: '/crm/reports',
  },
  users: {
    id: 'users',
    title: 'Team',
    description: 'Invite teammates and manage role-based access.',
    permissions: ['users.view', 'users.manage'],
    apiPath: '/crm/users',
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    description: 'Configure organization preferences and integrations.',
    permissions: ['settings.view', 'settings.manage'],
    apiPath: '/crm/settings',
  },
  platform: {
    id: 'platform',
    title: 'Platform',
    description: 'Super admin controls for tenants, billing, and system health.',
    permissions: ['platform.view', 'platform.manage'],
    apiPath: '/crm/platform',
  },
} as const satisfies Record<CrmModuleId, CrmModuleDefinition>;

export function getCrmModule(id: CrmModuleId): CrmModuleDefinition {
  return CRM_MODULES[id];
}
