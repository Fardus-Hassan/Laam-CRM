import { z } from 'zod';

export const navItemIdSchema = z.enum([
  'dashboard',
  'contacts',
  'companies',
  'leads',
  'orders',
  'campaigns',
  'incentive',
  'deals',
  'pipeline',
  'tasks',
  'activities',
  'inventory',
  'accounting',
  'reports',
  'users',
  'settings',
  'billing',
  'security',
  'courier',
  'support',
  'coupons',
  'recycle',
  'knowledge',
  'platform',
]);

export type NavItemId = z.infer<typeof navItemIdSchema>;

export const navGroupIdSchema = z.enum([
  'overview',
  'sales',
  'work',
  'inventory',
  'accounting',
  'insights',
  'administration',
]);

export type NavGroupId = z.infer<typeof navGroupIdSchema>;

export const crmModuleIdSchema = z.enum([
  'contacts',
  'companies',
  'leads',
  'orders',
  'campaigns',
  'incentive',
  'deals',
  'pipeline',
  'tasks',
  'activities',
  'inventory',
  'accounting',
  'reports',
  'users',
  'settings',
  'billing',
  'security',
  'courier',
  'support',
  'coupons',
  'recycle',
  'knowledge',
  'platform',
]);

export type CrmModuleId = z.infer<typeof crmModuleIdSchema>;
