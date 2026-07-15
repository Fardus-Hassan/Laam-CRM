import type { Permission } from '@laam/types';
import {
  BarChart3,
  CheckSquare,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';

import type { UniversalNavGroup } from '@/features/navigation/types/universal-nav';
import { getNavBadgeCounts } from '@/features/navigation/api/nav-badges-api';
import { buildOrdersNav } from '@/features/orders/config/build-orders-nav';

const pv = (p: Permission) => [p] as Permission[];
const acc = pv('accounting.view');

/** Full app navigation — filtered by effective user permissions. Badges via navBadgesApi. */
export function getUniversalNavRegistry(): UniversalNavGroup[] {
  const badges = getNavBadgeCounts();

  return [
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
          children: buildOrdersNav().map((queue) => ({
            id: queue.id,
            title: queue.title,
            url: queue.url,
            permissions: queue.permissions,
            badge: queue.badge,
          })),
        },
        {
          id: 'people',
          title: 'People',
          icon: Users,
          permissions: ['leads.view', 'companies.view', 'contacts.view'],
          children: [
            {
              id: 'leads',
              title: 'Leads',
              url: '/dashboard/leads',
              permissions: pv('leads.view'),
            },
            {
              id: 'customers',
              title: 'Customers',
              url: '/dashboard/customers',
              permissions: pv('companies.view'),
            },
            {
              id: 'contacts',
              title: 'Suppliers & partners',
              url: '/dashboard/contacts',
              permissions: pv('contacts.view'),
            },
          ],
        },
        {
          id: 'marketing',
          title: 'Marketing',
          icon: Megaphone,
          permissions: ['campaigns.view', 'reports.view'],
          children: [
            {
              id: 'campaigns-active',
              title: 'Campaigns',
              url: '/dashboard/campaigns',
              permissions: pv('campaigns.view'),
            },
            {
              id: 'campaigns-budget',
              title: 'Ad budget',
              url: '/dashboard/campaigns?tab=budget',
              permissions: pv('campaigns.manage_budget'),
            },
            {
              id: 'campaigns-landing',
              title: 'Landing pages',
              url: '/dashboard/campaigns?tab=landing',
              permissions: pv('campaigns.edit'),
            },
            {
              id: 'campaign-roi',
              title: 'Campaign ROI',
              url: '/dashboard/reports?view=campaign',
              permissions: pv('reports.view'),
            },
            {
              id: 'lead-sources',
              title: 'Lead sources',
              url: '/dashboard/reports?view=sources',
              permissions: pv('reports.view'),
            },
          ],
        },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      items: [
        {
          id: 'inventory',
          title: 'Inventory',
          icon: Package,
          permissions: pv('inventory.view'),
          children: [
            {
              id: 'inv-products',
              title: 'Products',
              url: '/dashboard/inventory/products',
              permissions: pv('inventory.view'),
              badge: badges.lowStock,
            },
            {
              id: 'inv-suppliers',
              title: 'Suppliers',
              url: '/dashboard/inventory/suppliers',
              permissions: pv('inventory.view'),
            },
            {
              id: 'inv-purchase',
              title: 'Purchase',
              url: '/dashboard/inventory/purchase',
              permissions: pv('inventory.purchase'),
            },
            {
              id: 'inv-returns',
              title: 'Purchase returns',
              url: '/dashboard/inventory/purchase-returns',
              permissions: pv('inventory.view'),
            },
            {
              id: 'inv-adjustment',
              title: 'Stock adjustment',
              url: '/dashboard/inventory/adjustment',
              permissions: pv('inventory.adjust'),
            },
            {
              id: 'inv-mixer',
              title: 'Mixer / production',
              url: '/dashboard/inventory/mixer',
              permissions: pv('inventory.view'),
            },
          ],
        },
        {
          id: 'accounting',
          title: 'Accounting',
          icon: Wallet,
          permissions: acc,
          children: [
            {
              id: 'acc-overview',
              title: 'Overview',
              url: '/dashboard/accounting/overview',
              permissions: acc,
            },
            {
              id: 'acc-income',
              title: 'Income',
              url: '/dashboard/accounting/income',
              permissions: acc,
            },
            {
              id: 'acc-expenses',
              title: 'Expenses',
              url: '/dashboard/accounting/expenses',
              permissions: acc,
            },
            {
              id: 'acc-ledger',
              title: 'Ledger',
              url: '/dashboard/accounting/ledger',
              permissions: acc,
            },
            {
              id: 'acc-receivables',
              title: 'Receivables',
              url: '/dashboard/accounting/receivables',
              permissions: acc,
              badge: badges.receivables,
            },
            {
              id: 'acc-payables',
              title: 'Payables',
              url: '/dashboard/accounting/payables',
              permissions: acc,
            },
            {
              id: 'acc-cash',
              title: 'Cash & bank',
              url: '/dashboard/accounting/cash-bank',
              permissions: acc,
            },
            {
              id: 'acc-coa',
              title: 'Chart of accounts',
              url: '/dashboard/accounting/chart-of-accounts',
              permissions: pv('accounting.manage'),
            },
            {
              id: 'acc-pnl',
              title: 'Profit & loss',
              url: '/dashboard/accounting/profit-loss',
              permissions: acc,
            },
            {
              id: 'acc-bs',
              title: 'Balance sheet',
              url: '/dashboard/accounting/balance-sheet',
              permissions: acc,
            },
          ],
        },
        {
          id: 'work',
          title: 'Work',
          icon: CheckSquare,
          permissions: [
            'activities.view',
            'tasks.view',
            'settings.manage',
            'knowledge.view',
            'dashboard.view',
            'courier.view',
            'support.view',
            'coupons.view',
            'notifications.view',
          ],
          children: [
            {
              id: 'activities',
              title: 'Follow ups',
              url: '/dashboard/followups',
              permissions: pv('activities.view'),
              badge: badges.followups,
            },
            {
              id: 'notifications',
              title: 'Notifications',
              url: '/dashboard/notifications',
              permissions: pv('notifications.view'),
            },
            {
              id: 'tasks',
              title: 'Tasks',
              url: '/dashboard/tasks',
              permissions: pv('tasks.view'),
              badge: badges.tasks,
            },
            {
              id: 'calendar',
              title: 'Calendar',
              url: '/dashboard/calendar',
              permissions: pv('dashboard.view'),
            },
            {
              id: 'automations',
              title: 'Automations',
              url: '/dashboard/automations',
              permissions: pv('settings.manage'),
            },
            {
              id: 'knowledge',
              title: 'Knowledge base',
              url: '/dashboard/knowledge',
              permissions: pv('knowledge.view'),
            },
            {
              id: 'courier',
              title: 'Courier hub',
              url: '/dashboard/courier',
              permissions: pv('courier.view'),
              badge: badges.courier,
            },
            {
              id: 'support',
              title: 'Support',
              url: '/dashboard/support',
              permissions: pv('support.view'),
              badge: badges.support,
            },
            {
              id: 'coupons',
              title: 'Coupons',
              url: '/dashboard/coupons',
              permissions: pv('coupons.view'),
            },
          ],
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
            {
              id: 'reports-summary',
              title: 'Summary',
              url: '/dashboard/reports?view=summary',
              permissions: pv('reports.view'),
            },
            {
              id: 'reports-sales',
              title: 'Sales',
              url: '/dashboard/reports?view=sales',
              permissions: pv('reports.view'),
            },
            {
              id: 'reports-product',
              title: 'Products',
              url: '/dashboard/reports?view=product-sales',
              permissions: pv('reports.view'),
            },
            {
              id: 'reports-agents',
              title: 'Team performance',
              url: '/dashboard/reports?view=agents',
              permissions: pv('reports.view'),
            },
            {
              id: 'reports-meta',
              title: 'Marketing',
              url: '/dashboard/reports?view=marketing',
              permissions: pv('reports.view'),
            },
            {
              id: 'team-targets',
              title: 'Team targets',
              url: '/dashboard/reports?view=team-targets',
              permissions: pv('reports.view'),
            },
          ],
        },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      items: [
        {
          id: 'settings',
          title: 'Settings',
          icon: Settings,
          permissions: [
            'settings.view',
            'settings.manage',
            'users.view',
            'users.manage',
            'roles.view',
            'roles.manage',
            'billing.view',
            'security.view',
            'recycle.view',
          ],
          children: [
            {
              id: 'settings-home',
              title: 'General',
              url: '/dashboard/settings',
              permissions: ['settings.view', 'settings.manage'],
            },
            {
              id: 'settings-org',
              title: 'Organization',
              url: '/dashboard/settings/organization',
              permissions: pv('settings.view'),
            },
            {
              id: 'settings-brand',
              title: 'Brand',
              url: '/dashboard/settings/brand',
              permissions: ['brand.view', 'brand.manage', 'settings.manage'],
            },
            {
              id: 'settings-integrations',
              title: 'Integrations',
              url: '/dashboard/settings/integrations',
              permissions: pv('settings.manage'),
            },
            {
              id: 'settings-categories',
              title: 'Categories',
              url: '/dashboard/settings/categories',
              permissions: pv('settings.manage'),
            },
            {
              id: 'settings-order-statuses',
              title: 'Order statuses',
              url: '/dashboard/settings/order-statuses',
              permissions: pv('settings.manage'),
            },
            {
              id: 'settings-sms',
              title: 'SMS templates',
              url: '/dashboard/settings/sms-templates',
              permissions: pv('settings.manage'),
            },
            {
              id: 'users',
              title: 'Users',
              url: '/dashboard/users?view=team',
              permissions: ['users.view', 'users.manage', 'users.invite'],
            },
            {
              id: 'roles',
              title: 'Roles & permissions',
              url: '/dashboard/settings/roles',
              permissions: ['roles.view', 'roles.manage'],
            },
            {
              id: 'billing',
              title: 'Billing',
              url: '/dashboard/billing',
              permissions: pv('billing.view'),
            },
            {
              id: 'security',
              title: 'Blocked list',
              url: '/dashboard/security/blocked',
              permissions: pv('security.view'),
              badge: badges.blocked,
            },
            {
              id: 'data-import',
              title: 'Bulk import',
              url: '/dashboard/settings/import',
              permissions: pv('settings.manage'),
            },
            {
              id: 'recycle',
              title: 'Recycle bin',
              url: '/dashboard/recycle-bin',
              permissions: pv('recycle.view'),
            },
          ],
        },
      ],
    },
    {
      id: 'platform',
      label: 'Platform',
      items: [
        {
          id: 'platform',
          title: 'Platform',
          icon: Shield,
          permissions: pv('platform.view'),
          children: [
            {
              id: 'platform-home',
              title: 'Overview',
              url: '/dashboard/platform',
              permissions: pv('platform.view'),
            },
            {
              id: 'platform-brand',
              title: 'Brand',
              url: '/dashboard/platform/brand',
              permissions: ['platform.view', 'platform.manage'],
            },
            {
              id: 'orgs-all',
              title: 'All tenants',
              url: '/dashboard/platform?tab=tenants',
              permissions: pv('platform.view'),
            },
            {
              id: 'orgs-onboard',
              title: 'Onboarding',
              url: '/dashboard/platform?tab=onboarding',
              permissions: pv('platform.manage'),
            },
            {
              id: 'health-overview',
              title: 'System health',
              url: '/dashboard/platform?tab=health',
              permissions: pv('platform.view'),
            },
            {
              id: 'health-api',
              title: 'API gateway',
              url: '/dashboard/platform?tab=api',
              permissions: pv('platform.manage'),
            },
            {
              id: 'subs-plans',
              title: 'Plans',
              url: '/dashboard/platform?tab=plans',
              permissions: pv('platform.manage'),
            },
            {
              id: 'subs-billing',
              title: 'Subscriptions',
              url: '/dashboard/platform?tab=billing',
              permissions: pv('platform.manage'),
            },
          ],
        },
      ],
    },
  ];
}

/** @deprecated Prefer getUniversalNavRegistry() for fresh badges */
export const UNIVERSAL_NAV_REGISTRY = getUniversalNavRegistry();
