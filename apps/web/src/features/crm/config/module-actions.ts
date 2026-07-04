import type { CrmModuleId, Permission } from '@laam/types';

export type CrmPageAction = {
  permission: Permission;
  label: string;
  href?: string;
  variant?: 'default' | 'outline' | 'secondary';
};

export const CRM_MODULE_ACTIONS: Partial<Record<CrmModuleId, CrmPageAction[]>> = {
  contacts: [
    { permission: 'contacts.create', label: 'New Contact', href: '/dashboard/contacts/new' },
    { permission: 'settings.manage', label: 'Import', href: '/dashboard/settings/import', variant: 'outline' },
  ],
  companies: [
    { permission: 'companies.create', label: 'New Customer', href: '/dashboard/customers/new' },
    { permission: 'companies.edit', label: 'Merge duplicates', href: '/dashboard/customers/merge', variant: 'outline' },
    { permission: 'settings.manage', label: 'Import', href: '/dashboard/settings/import', variant: 'outline' },
  ],
  leads: [
    { permission: 'leads.create', label: 'New Lead', href: '/dashboard/leads/new' },
    { permission: 'leads.export', label: 'Export', variant: 'outline' },
  ],
  orders: [
    { permission: 'orders.create', label: 'New Order', href: '/dashboard/orders/new' },
  ],
  campaigns: [
    { permission: 'campaigns.view', label: 'View campaigns', href: '/dashboard/campaigns' },
    { permission: 'campaigns.manage_budget', label: 'Ad Budget', href: '/dashboard/campaigns?tab=budget', variant: 'outline' },
  ],
  tasks: [
    { permission: 'tasks.create', label: 'New Task', href: '/dashboard/tasks/new' },
  ],
  reports: [
    { permission: 'reports.export', label: 'Export Report', variant: 'outline' },
  ],
  users: [
    { permission: 'users.manage', label: 'Invite User', href: '/dashboard/users' },
  ],
  billing: [
    { permission: 'billing.view', label: 'Open billing', href: '/dashboard/billing' },
  ],
  security: [
    { permission: 'security.manage', label: 'Block IP/Mobile', href: '/dashboard/security/blocked' },
  ],
  courier: [
    { permission: 'courier.manage', label: 'Submit to courier', href: '/dashboard/courier' },
  ],
  support: [
    { permission: 'support.create', label: 'New Ticket', href: '/dashboard/support' },
  ],
  coupons: [
    { permission: 'coupons.manage', label: 'New Coupon', href: '/dashboard/coupons' },
  ],
  recycle: [
    { permission: 'recycle.view', label: 'Open Recycle Bin', href: '/dashboard/recycle-bin' },
  ],
  knowledge: [
    { permission: 'knowledge.manage', label: 'Add article', href: '/dashboard/knowledge' },
  ],
  platform: [
    { permission: 'platform.manage', label: 'Add Tenant', href: '/dashboard/platform?tab=onboarding' },
  ],
  inventory: [
    { permission: 'inventory.create', label: 'New Product', href: '/dashboard/inventory/products/new' },
    { permission: 'inventory.purchase', label: 'Purchases', href: '/dashboard/inventory/purchase', variant: 'outline' },
    { permission: 'inventory.adjust', label: 'Adjust Stock', variant: 'secondary', href: '/dashboard/inventory/adjustment' },
  ],
  accounting: [
    { permission: 'accounting.create', label: 'Record Income', href: '/dashboard/accounting/income' },
    { permission: 'accounting.create', label: 'Record Expense', href: '/dashboard/accounting/expenses', variant: 'outline' },
    { permission: 'accounting.view', label: 'Receivables', href: '/dashboard/accounting/receivables', variant: 'outline' },
  ],
};
