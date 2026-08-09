import { DashboardHeader } from '@/components/layout/dashboard-header';
import { RoleDashboard } from '@/features/dashboard/components/role-dashboard';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Overview of your CRM workspace"
        breadcrumbs={[{ label: 'Dashboard', href: siteConfig.dashboardRoute }]}
      />
      <RoleDashboard />
    </>
  );
}
