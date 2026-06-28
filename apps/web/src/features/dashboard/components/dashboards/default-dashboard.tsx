'use client';

import type { DashboardResponse } from '@laam/types';

import { KpiStatGrid } from '@/components/dashboard/kpi-stat-card';
import { ContentPanel } from '@/components/layout/content-panel';
import { DashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';

type DefaultDashboardViewProps = {
  data: Extract<DashboardResponse, { kind: 'default' }>['data'];
};

export function DefaultDashboardView({ data }: DefaultDashboardViewProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">{data.title}</h2>
        {data.subtitle ? (
          <p className="text-sm text-muted-foreground">{data.subtitle}</p>
        ) : null}
      </div>
      <DashboardWidget widget="kpis">
        <KpiStatGrid metrics={data.kpis} className="2xl:grid-cols-3" />
      </DashboardWidget>
      <ContentPanel className="min-h-[40vh] flex-1">
        <h3 className="text-base font-semibold">Welcome to Laam CRM</h3>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Role-specific dashboards are being rolled out. Switch to Sales Manager
          from the user menu to preview the Sales Head dashboard.
        </p>
      </ContentPanel>
    </div>
  );
}
