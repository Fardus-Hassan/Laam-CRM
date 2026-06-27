import { DashboardHeader } from '@/components/layout/dashboard-header';
import { fetchDashboard } from '@/features/dashboard/api/dashboard-api';
import { RoleDashboard } from '@/features/dashboard/components/role-dashboard';
import { getDefaultDateRange, toISODateRange } from '@/lib/date-range';
import { siteConfig } from '@/config/site';

export default async function DashboardPage() {
  const isoRange = toISODateRange(getDefaultDateRange());
  const dashboard = await fetchDashboard('org_admin', isoRange ?? undefined);

  const title =
    dashboard.kind === 'sales_head' ? dashboard.data.title : 'Dashboard';

  const description =
    dashboard.kind === 'sales_head'
      ? dashboard.data.subtitle
      : 'Overview of your CRM workspace';

  return (
    <>
      <DashboardHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: 'Dashboard', href: siteConfig.dashboardRoute }]}
      />
      <RoleDashboard initialData={dashboard} />
    </>
  );
}
