import { DashboardHeader } from '@/components/layout/dashboard-header';
import { fetchDashboardStats } from '@/features/dashboard/api/dashboard-api';
import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview';

export default async function DashboardPage() {
  const stats = await fetchDashboardStats();

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Overview of your CRM workspace"
        breadcrumbs={[{ label: 'Dashboard' }]}
      />
      <DashboardOverview stats={stats} />
    </>
  );
}
