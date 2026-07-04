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
    description: 'Buyers, suppliers, and partners — call, WhatsApp, and follow-up in one list.',
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
    description: 'Calls, order confirmations, courier checks, and payment follow-ups for your team.',
    permissions: ['tasks.view'],
    apiPath: '/crm/tasks',
  },
  activities: {
    id: 'activities',
    title: 'Follow Ups',
    description: 'Customer callbacks — schedule, notes, and repeat orders for modhu & khejur buyers.',
    permissions: ['activities.view'],
    apiPath: '/crm/followups',
  },
  inventory: {
    id: 'inventory',
    title: 'Inventory',
    description: 'Products, stock, suppliers, purchases, and adjustments for your shop.',
    permissions: ['inventory.view'],
    apiPath: '/crm/inventory',
  },
  accounting: {
    id: 'accounting',
    title: 'Accounting',
    description: 'Income, expenses, ledger, receivables, payables, and financial reports.',
    permissions: ['accounting.view'],
    apiPath: '/crm/accounting',
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
  billing: {
    id: 'billing',
    title: 'Billing',
    description: 'Laam subscription, SMS credits, and invoices.',
    permissions: ['billing.view', 'billing.manage'],
    apiPath: '/crm/billing',
  },
  security: {
    id: 'security',
    title: 'Security',
    description: 'Block suspicious IPs and mobile numbers.',
    permissions: ['security.view', 'security.manage'],
    apiPath: '/crm/security',
  },
  courier: {
    id: 'courier',
    title: 'Courier Hub',
    description: 'Courier accounts, bulk submit, and tracking inbox.',
    permissions: ['courier.view', 'courier.manage'],
    apiPath: '/crm/courier',
  },
  support: {
    id: 'support',
    title: 'Support',
    description: 'Customer tickets linked to orders.',
    permissions: ['support.view', 'support.create', 'support.manage'],
    apiPath: '/crm/support',
  },
  coupons: {
    id: 'coupons',
    title: 'Coupons',
    description: 'Promo codes and discounts for orders.',
    permissions: ['coupons.view', 'coupons.manage'],
    apiPath: '/crm/coupons',
  },
  recycle: {
    id: 'recycle',
    title: 'Recycle Bin',
    description: 'Restore soft-deleted records.',
    permissions: ['recycle.view', 'recycle.manage'],
    apiPath: '/crm/recycle-bin',
  },
  knowledge: {
    id: 'knowledge',
    title: 'Knowledge base',
    description: 'Answers for WhatsApp and Messenger automation bots.',
    permissions: ['knowledge.view', 'knowledge.manage'],
    apiPath: '/crm/knowledge',
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
