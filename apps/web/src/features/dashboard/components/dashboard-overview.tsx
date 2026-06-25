import type { DashboardStats } from '@/features/dashboard/types';
import { StatCard } from '@/features/dashboard/components/stat-card';
import { ContentPanel } from '@/components/layout/content-panel';

type DashboardOverviewProps = {
  stats: DashboardStats;
};

export function DashboardOverview({ stats }: DashboardOverviewProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <StatCard label="Pipeline value" value={stats.pipelineValue} />
        <StatCard label="Open deals" value={stats.openDeals} />
        <StatCard label="New leads" value={stats.newLeads} />
      </div>
      <ContentPanel className="min-h-[50vh] flex-1">
        <h2 className="text-lg font-semibold">Welcome to Laam CRM</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Sidebar menu items change based on your role. Open the user menu at the
          bottom and try &quot;Switch role (demo)&quot; to see different navigation.
        </p>
      </ContentPanel>
    </div>
  );
}
