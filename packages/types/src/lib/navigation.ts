import { z } from 'zod';

export const navItemIdSchema = z.enum([
  'dashboard',
  'contacts',
  'companies',
  'leads',
  'orders',
  'campaigns',
  'deals',
  'pipeline',
  'tasks',
  'activities',
  'reports',
  'users',
  'settings',
  'platform',
]);

export type NavItemId = z.infer<typeof navItemIdSchema>;

export const navGroupIdSchema = z.enum([
  'overview',
  'sales',
  'work',
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
  'deals',
  'pipeline',
  'tasks',
  'activities',
  'reports',
  'users',
  'settings',
  'platform',
]);

export type CrmModuleId = z.infer<typeof crmModuleIdSchema>;
