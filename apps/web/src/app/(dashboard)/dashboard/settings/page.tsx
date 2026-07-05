import Link from 'next/link';
import {
  Ban,
  CreditCard,
  BookOpen,
  FileUp,
  GitBranch,
  MessageSquare,
  Plug,
  Settings2,
  Tags,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';

import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SETTINGS_LINKS = [
  {
    title: 'Organization',
    description: 'Company profile, order prefix, courier defaults, and timezone.',
    href: '/dashboard/settings/organization',
    icon: Settings2,
  },
  {
    title: 'Integrations',
    description: 'Couriers, bKash, Facebook leads, email SMTP, and WooCommerce.',
    href: '/dashboard/settings/integrations',
    icon: Plug,
  },
  {
    title: 'Categories',
    description: 'Product, income, expense, and knowledge categories per organization.',
    href: '/dashboard/settings/categories',
    icon: Tags,
  },
  {
    title: 'Order Statuses',
    description: 'Pipeline statuses, sidebar placement, and nested queue tabs.',
    href: '/dashboard/settings/order-statuses',
    icon: GitBranch,
  },
  {
    title: 'SMS Templates',
    description: 'Bulk SMS message templates for order notifications.',
    href: '/dashboard/settings/sms-templates',
    icon: MessageSquare,
  },
  {
    title: 'Roles & Permissions',
    description: 'Create custom roles and assign page/action permissions.',
    href: '/dashboard/settings/roles',
    icon: UserCog,
  },
  {
    title: 'Team & Admins',
    description: 'Invite users, assign roles, and manage access overrides.',
    href: '/dashboard/users',
    icon: Users,
  },
  {
    title: 'Billing',
    description: 'Laam subscription, SMS credits, invoices, and payment methods.',
    href: '/dashboard/billing',
    icon: CreditCard,
  },
  {
    title: 'Blocked IPs & Mobiles',
    description: 'Fraud prevention — block suspicious IPs and phone numbers.',
    href: '/dashboard/security/blocked',
    icon: Ban,
  },
  {
    title: 'Recycle Bin',
    description: 'Restore soft-deleted orders, customers, products, and leads.',
    href: '/dashboard/recycle-bin',
    icon: Trash2,
  },
  {
    title: 'Bulk import',
    description: 'Import 10k–20k customers and orders from your old CRM (CSV).',
    href: '/dashboard/settings/import',
    icon: FileUp,
  },
  {
    title: 'Knowledge base',
    description: 'Answers for WhatsApp & Messenger automation bots.',
    href: '/dashboard/knowledge',
    icon: BookOpen,
  },
];

export default function SettingsPage() {
  return (
    <PageShell
      title="Settings"
      description="Configure your organization, team access, billing, and security."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_LINKS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full gap-0 py-0 shadow-none transition-colors hover:bg-muted/40">
              <CardHeader className="flex flex-row items-center gap-3 border-b px-4 py-3">
                <item.icon className="size-5 text-primary" />
                <CardTitle className="text-sm">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-sm text-muted-foreground">
                {item.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
