import type { CrmModuleId, Permission } from '@laam/types';

export type CrmPageAction = {
  permission: Permission;
  label: string;
  variant?: 'default' | 'outline' | 'secondary';
};

export const CRM_MODULE_ACTIONS: Partial<Record<CrmModuleId, CrmPageAction[]>> = {
  contacts: [
    { permission: 'contacts.create', label: 'New Contact' },
    { permission: 'contacts.edit', label: 'Import', variant: 'outline' },
  ],
  companies: [
    { permission: 'companies.create', label: 'New Customer' },
    { permission: 'companies.edit', label: 'Import', variant: 'outline' },
  ],
  leads: [
    { permission: 'leads.create', label: 'New Lead' },
    { permission: 'leads.export', label: 'Export', variant: 'outline' },
    { permission: 'leads.assign', label: 'Assign', variant: 'secondary' },
  ],
  orders: [
    { permission: 'orders.create', label: 'New Order' },
    { permission: 'orders.export', label: 'Export', variant: 'outline' },
    { permission: 'orders.confirm', label: 'Bulk Confirm', variant: 'secondary' },
  ],
  campaigns: [
    { permission: 'campaigns.create', label: 'New Campaign' },
    { permission: 'campaigns.edit', label: 'Edit Budget', variant: 'outline' },
    { permission: 'campaigns.manage_budget', label: 'Manage Budget', variant: 'secondary' },
  ],
  tasks: [
    { permission: 'tasks.create', label: 'New Task' },
    { permission: 'tasks.assign', label: 'Assign', variant: 'outline' },
  ],
  activities: [
    { permission: 'activities.create', label: 'Log Activity' },
  ],
  reports: [
    { permission: 'reports.export', label: 'Export Report', variant: 'outline' },
  ],
  users: [
    { permission: 'users.manage', label: 'Invite User' },
  ],
  platform: [
    { permission: 'platform.manage', label: 'Add Tenant' },
  ],
};
