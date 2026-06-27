import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Building2,
  CheckSquare,
  Contact,
  Handshake,
  Kanban,
  LayoutDashboard,
  Settings,
  Shield,
  Target,
  Users,
} from 'lucide-react';
import type {
  NavGroupId,
  NavItemId,
  Permission,
} from '@laam/types';

export type NavItemDefinition = {
  id: NavItemId;
  title: string;
  url: string;
  icon: LucideIcon;
  group: NavGroupId;
  permissions: Permission[];
};

export const NAV_GROUP_LABELS: Record<NavGroupId, string> = {
  overview: 'Overview',
  sales: 'Sales',
  work: 'Work',
  insights: 'Insights',
  administration: 'Administration',
};

/** Flat sidebar display order (matches product mockup). */
export const NAV_SIDEBAR_ORDER: NavItemId[] = [
  'dashboard',
  'leads',
  'contacts',
  'companies',
  'deals',
  'tasks',
  'activities',
  'reports',
  'users',
  'settings',
  'pipeline',
  'platform',
];

export const NAV_ITEMS: NavItemDefinition[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    group: 'overview',
    permissions: ['dashboard.view'],
  },
  {
    id: 'leads',
    title: 'Leads',
    url: '/dashboard/leads',
    icon: Target,
    group: 'sales',
    permissions: ['leads.view'],
  },
  {
    id: 'contacts',
    title: 'Contacts',
    url: '/dashboard/contacts',
    icon: Contact,
    group: 'sales',
    permissions: ['contacts.view'],
  },
  {
    id: 'companies',
    title: 'Customers',
    url: '/dashboard/companies',
    icon: Building2,
    group: 'sales',
    permissions: ['companies.view'],
  },
  {
    id: 'deals',
    title: 'Deals',
    url: '/dashboard/deals',
    icon: Handshake,
    group: 'sales',
    permissions: ['deals.view'],
  },
  {
    id: 'tasks',
    title: 'Tasks',
    url: '/dashboard/tasks',
    icon: CheckSquare,
    group: 'work',
    permissions: ['tasks.view'],
  },
  {
    id: 'activities',
    title: 'Follow Ups',
    url: '/dashboard/activities',
    icon: Activity,
    group: 'work',
    permissions: ['activities.view'],
  },
  {
    id: 'reports',
    title: 'Reports',
    url: '/dashboard/reports',
    icon: BarChart3,
    group: 'insights',
    permissions: ['reports.view'],
  },
  {
    id: 'users',
    title: 'Team',
    url: '/dashboard/users',
    icon: Users,
    group: 'administration',
    permissions: ['users.manage'],
  },
  {
    id: 'settings',
    title: 'Settings',
    url: '/dashboard/settings',
    icon: Settings,
    group: 'administration',
    permissions: ['settings.manage'],
  },
  {
    id: 'pipeline',
    title: 'Pipeline',
    url: '/dashboard/pipeline',
    icon: Kanban,
    group: 'sales',
    permissions: ['pipeline.view'],
  },
  {
    id: 'platform',
    title: 'Platform',
    url: '/dashboard/platform',
    icon: Shield,
    group: 'administration',
    permissions: ['platform.manage'],
  },
];

export const NAV_GROUP_ORDER: NavGroupId[] = [
  'overview',
  'sales',
  'work',
  'insights',
  'administration',
];
