import Link from 'next/link';
import { GitBranch, UserCog, Settings2 } from 'lucide-react';

import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SETTINGS_LINKS = [
  {
    title: 'Order Statuses',
    description: 'Pipeline statuses, sidebar placement, and nested queue tabs.',
    href: '/dashboard/settings/order-statuses',
    icon: GitBranch,
  },
  {
    title: 'Roles & Permissions',
    description: 'Create custom roles and assign page/action permissions.',
    href: '/dashboard/settings/roles',
    icon: UserCog,
  },
  {
    title: 'Organization',
    description: 'Company profile, products, and integrations.',
    href: '/dashboard/settings?tab=organization',
    icon: Settings2,
  },
];

export default function SettingsPage() {
  return (
    <PageShell
      title="Settings"
      description="Configure your organization, roles, and access control."
    >
      <div className="grid gap-4 sm:grid-cols-2">
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
