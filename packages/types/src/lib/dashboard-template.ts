import { z } from 'zod';
import type { Permission } from './permission-catalog.js';
import type { UserRole } from './roles.js';

export const dashboardTemplateSchema = z.enum([
  'platform',
  'executive',
  'sales_head',
  'team_leader',
  'agent',
  'marketing',
  'support',
  'finance',
  'default',
]);

export type DashboardTemplate = z.infer<typeof dashboardTemplateSchema>;

export const DASHBOARD_TEMPLATE_LABELS: Record<DashboardTemplate, string> = {
  platform: 'Platform Admin',
  executive: 'Executive',
  sales_head: 'Sales Head',
  team_leader: 'Team Leader',
  agent: 'Agent',
  marketing: 'Marketing',
  support: 'Support',
  finance: 'Finance',
  default: 'Default',
};

/** Default dashboard template per preset system role (demo / bootstrap). */
export const ROLE_DASHBOARD_TEMPLATE: Record<UserRole, DashboardTemplate> = {
  super_admin: 'platform',
  org_admin: 'executive',
  ceo: 'executive',
  team_leader: 'team_leader',
  sales_manager: 'sales_head',
  sales_rep: 'agent',
  marketing_head: 'marketing',
  support_agent: 'support',
  finance: 'finance',
  viewer: 'default',
};

/** Widget sections gated by permission keys. */
export const DASHBOARD_WIDGET_PERMISSIONS = {
  kpis: 'dashboard.view',
  revenue: 'dashboard.widget.revenue',
  orders: 'dashboard.widget.orders',
  leads: 'dashboard.widget.leads',
  team: 'dashboard.widget.team',
  marketing: 'dashboard.widget.marketing',
  platform: 'dashboard.widget.platform',
} as const satisfies Record<string, Permission>;
