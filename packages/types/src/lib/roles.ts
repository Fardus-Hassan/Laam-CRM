import { z } from 'zod';

export const userRoleSchema = z.enum([
  'super_admin',
  'org_admin',
  'ceo',
  'team_leader',
  'sales_manager',
  'sales_rep',
  'marketing_head',
  'support_agent',
  'finance',
  'viewer',
]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const USER_ROLES = userRoleSchema.options;

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Org Admin',
  ceo: 'CEO',
  team_leader: 'Team Leader',
  sales_manager: 'Sales Manager',
  sales_rep: 'Sales Rep',
  marketing_head: 'Marketing Head',
  support_agent: 'Support Agent',
  finance: 'Finance',
  viewer: 'Viewer',
};
