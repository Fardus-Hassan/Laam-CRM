import type { Permission } from '@laam/types';
import {
  Activity,
  BarChart3,
  Building2,
  CheckSquare,
  Contact,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Server,
  Settings,
  Shield,
  ShoppingCart,
  Target,
  TrendingUp,
  UserCog,
  Users,
  UsersRound,
} from 'lucide-react';

import type { UniversalNavGroup } from '@/features/navigation/types/universal-nav';

const pv = (p: Permission) => [p] as Permission[];

/** Full app navigation — filtered by effective user permissions. */
export const UNIVERSAL_NAV_REGISTRY: UniversalNavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        icon: LayoutDashboard,
        url: '/dashboard',
        permissions: pv('dashboard.view'),
      },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      {
        id: 'orders',
        title: 'Orders',
        icon: ShoppingCart,
        permissions: pv('orders.view'),
        children: [
          { id: 'orders-all', title: 'All Orders', url: '/dashboard/orders', permissions: pv('orders.view') },
          { id: 'orders-pending', title: 'Pending', url: '/dashboard/orders?status=pending', permissions: pv('orders.view') },
          { id: 'orders-confirmed', title: 'Confirmed', url: '/dashboard/orders?status=confirmed', permissions: pv('orders.confirm') },
          { id: 'orders-hold', title: 'On Hold', url: '/dashboard/orders?status=hold', permissions: pv('orders.view') },
          { id: 'orders-cancelled', title: 'Cancelled', url: '/dashboard/orders?status=cancelled', permissions: pv('orders.cancel') },
          { id: 'orders-delivered', title: 'Delivered', url: '/dashboard/orders?status=delivered', permissions: pv('orders.view') },
        ],
      },
      {
        id: 'leads',
        title: 'Leads',
        icon: Target,
        permissions: pv('leads.view'),
        children: [
          { id: 'leads-all', title: 'All Leads', url: '/dashboard/leads', permissions: pv('leads.view') },
          { id: 'leads-facebook', title: 'Facebook', url: '/dashboard/leads?source=facebook', permissions: pv('leads.view') },
          { id: 'leads-call', title: 'Inbound Call', url: '/dashboard/leads?source=call', permissions: pv('leads.view') },
          { id: 'leads-ecommerce', title: 'E-commerce', url: '/dashboard/leads?source=ecommerce', permissions: pv('leads.view') },
          { id: 'leads-unassigned', title: 'Unassigned', url: '/dashboard/leads?status=unassigned', permissions: pv('leads.assign') },
        ],
      },
      {
        id: 'customers',
        title: 'Customers',
        icon: Building2,
        url: '/dashboard/companies',
        permissions: pv('companies.view'),
      },
      {
        id: 'contacts',
        title: 'Contacts',
        icon: Contact,
        url: '/dashboard/contacts',
        permissions: pv('contacts.view'),
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      {
        id: 'campaigns',
        title: 'Campaigns',
        icon: Megaphone,
        permissions: pv('campaigns.view'),
        children: [
          { id: 'campaigns-active', title: 'Active', url: '/dashboard/campaigns', permissions: pv('campaigns.view') },
          { id: 'campaigns-budget', title: 'Ad Budget', url: '/dashboard/campaigns?tab=budget', permissions: pv('campaigns.manage_budget') },
          { id: 'campaigns-landing', title: 'Landing Pages', url: '/dashboard/campaigns?tab=landing', permissions: pv('campaigns.edit') },
        ],
      },
      {
        id: 'campaign-roi',
        title: 'Campaign ROI',
        icon: TrendingUp,
        url: '/dashboard/reports?view=campaign',
        permissions: pv('reports.view'),
      },
      {
        id: 'lead-sources',
        title: 'Lead Sources',
        icon: Target,
        url: '/dashboard/reports?view=sources',
        permissions: pv('reports.view'),
      },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    items: [
      {
        id: 'activities',
        title: 'Follow Ups',
        icon: Activity,
        url: '/dashboard/activities',
        permissions: pv('activities.view'),
      },
      {
        id: 'tasks',
        title: 'Tasks',
        icon: CheckSquare,
        url: '/dashboard/tasks',
        permissions: pv('tasks.view'),
      },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    items: [
      {
        id: 'team-agents',
        title: 'Team Agents',
        icon: UsersRound,
        url: '/dashboard/users?view=team',
        permissions: pv('users.view'),
      },
      {
        id: 'team-targets',
        title: 'Team Targets',
        icon: Target,
        url: '/dashboard/reports?view=team-targets',
        permissions: pv('reports.view'),
      },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      {
        id: 'reports',
        title: 'Reports',
        icon: BarChart3,
        permissions: pv('reports.view'),
        children: [
          { id: 'reports-sales', title: 'Sales', url: '/dashboard/reports?view=sales', permissions: pv('reports.view') },
          { id: 'reports-marketing', title: 'Marketing', url: '/dashboard/reports?view=marketing', permissions: pv('reports.view') },
          { id: 'reports-agents', title: 'Agents', url: '/dashboard/reports?view=agents', permissions: pv('reports.view') },
          { id: 'reports-teams', title: 'Teams', url: '/dashboard/reports?view=teams', permissions: pv('reports.view') },
          { id: 'reports-revenue', title: 'Revenue', url: '/dashboard/reports?view=revenue', permissions: pv('reports.view') },
          { id: 'reports-platform', title: 'Platform', url: '/dashboard/reports?view=platform', permissions: pv('platform.view') },
        ],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        id: 'users',
        title: 'Team',
        icon: Users,
        url: '/dashboard/users',
        permissions: ['users.view', 'users.manage'],
      },
      {
        id: 'roles',
        title: 'Roles',
        icon: UserCog,
        url: '/dashboard/settings/roles',
        permissions: ['roles.view', 'roles.manage'],
      },
      {
        id: 'settings',
        title: 'Settings',
        icon: Settings,
        permissions: ['settings.view', 'settings.manage'],
        children: [
          { id: 'settings-org', title: 'Organization', url: '/dashboard/settings', permissions: pv('settings.view') },
          { id: 'settings-products', title: 'Products', url: '/dashboard/settings?tab=products', permissions: pv('settings.manage') },
          { id: 'settings-integrations', title: 'Integrations', url: '/dashboard/settings?tab=integrations', permissions: pv('settings.manage') },
        ],
      },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    items: [
      {
        id: 'organizations',
        title: 'Organizations',
        icon: Building2,
        permissions: pv('platform.view'),
        children: [
          { id: 'orgs-all', title: 'All Tenants', url: '/dashboard/platform?tab=tenants', permissions: pv('platform.view') },
          { id: 'orgs-onboard', title: 'Onboarding', url: '/dashboard/platform?tab=onboarding', permissions: pv('platform.manage') },
        ],
      },
      {
        id: 'system-health',
        title: 'System Health',
        icon: Server,
        permissions: pv('platform.view'),
        children: [
          { id: 'health-overview', title: 'Overview', url: '/dashboard/platform?tab=health', permissions: pv('platform.view') },
          { id: 'health-api', title: 'API Gateway', url: '/dashboard/platform?tab=api', permissions: pv('platform.manage') },
        ],
      },
      {
        id: 'subscriptions',
        title: 'Subscriptions',
        icon: CreditCard,
        permissions: pv('platform.manage'),
        children: [
          { id: 'subs-plans', title: 'Plans', url: '/dashboard/platform?tab=plans', permissions: pv('platform.manage') },
          { id: 'subs-billing', title: 'Billing', url: '/dashboard/platform?tab=billing', permissions: pv('platform.manage') },
        ],
      },
      {
        id: 'platform-home',
        title: 'Platform',
        icon: Shield,
        url: '/dashboard/platform',
        permissions: pv('platform.view'),
      },
    ],
  },
];
