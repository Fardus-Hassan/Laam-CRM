'use client';

import * as React from 'react';
import type { SuperAdminDashboard } from '@laam/types';

import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { CardLinkAction } from '@/components/dashboard/card-link-action';
import { KpiStatGrid } from '@/components/dashboard/kpi-stat-card';
import { AgentActivityFeed } from '@/components/dashboard/agent-activity-feed';
import { SystemHealthList } from '@/components/dashboard/system-health-list';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { DualAxisLineChart } from '@/components/charts/dual-axis-line-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { SimpleBarChart } from '@/components/charts/simple-bar-chart';
import { StorageUsageChart } from '@/components/charts/storage-usage-chart';
import { DateRangePicker } from '@/components/date-range/date-range-picker';
import { useDashboardDate } from '@/features/dashboard/providers/dashboard-date-provider';
import { useViewMore } from '@/features/dashboard/hooks/use-view-more';
import {
  transformDonutSegments,
  scaleMetricValue,
} from '@/features/dashboard/lib/period-data';
import type { DashboardPeriod } from '@/features/dashboard/types/period';
import { formatCurrency } from '@/lib/format';
import {
  RecentUsersTable,
  TopAgentsTable,
} from '@/features/dashboard/components/tables/super-admin-tables';

type SuperAdminDashboardViewProps = {
  data: SuperAdminDashboard;
};

const TABLE_SCROLL_CLASS =
  'custom-scrollbar -mx-3 overflow-x-auto px-3 sm:-mx-5 sm:px-5';

export function SuperAdminDashboardView({ data }: SuperAdminDashboardViewProps) {
  const { range, setRange } = useDashboardDate();

  const [salesPeriod, setSalesPeriod] = React.useState<DashboardPeriod>('week');
  const [ordersStatusPeriod, setOrdersStatusPeriod] =
    React.useState<DashboardPeriod>('week');
  const [rolePeriod, setRolePeriod] = React.useState<DashboardPeriod>('week');
  const [leadSourcesPeriod, setLeadSourcesPeriod] =
    React.useState<DashboardPeriod>('week');

  const usersViewMore = useViewMore(data.recentUsers.rows, 5);
  const agentsViewMore = useViewMore(data.topAgents.rows, 5);
  const activitiesViewMore = useViewMore(data.recentActivities.items, 4);

  const orderStatusSegments = React.useMemo(
    () => transformDonutSegments(data.ordersStatus.segments, ordersStatusPeriod),
    [data.ordersStatus.segments, ordersStatusPeriod],
  );

  const roleSegments = React.useMemo(
    () => transformDonutSegments(data.roleDistribution.segments, rolePeriod),
    [data.roleDistribution.segments, rolePeriod],
  );

  const leadSourceSegments = React.useMemo(
    () => transformDonutSegments(data.leadSources.segments, leadSourcesPeriod),
    [data.leadSources.segments, leadSourcesPeriod],
  );

  const totalOrders = React.useMemo(
    () => scaleMetricValue(data.ordersStatus.totalOrders, ordersStatusPeriod),
    [data.ordersStatus.totalOrders, ordersStatusPeriod],
  );

  const totalUsers = React.useMemo(
    () =>
      data.roleDistribution.segments.reduce(
        (sum, segment) => sum + segment.value,
        0,
      ),
    [data.roleDistribution.segments],
  );

  const totalLeads = React.useMemo(
    () => scaleMetricValue(data.leadSources.totalLeads, leadSourcesPeriod),
    [data.leadSources.totalLeads, leadSourcesPeriod],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            {data.title}
          </h2>
          {data.subtitle ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{data.subtitle}</p>
          ) : null}
        </div>
        <DateRangePicker
          value={range}
          onChange={setRange}
          align="end"
          className="w-full sm:w-auto"
        />
      </div>

      <KpiStatGrid metrics={data.kpis} columns={6} />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-12">
        <DashboardCard
          title={data.salesOverview.title}
          action={
            <PeriodFilter value={salesPeriod} onChange={setSalesPeriod} />
          }
          className="min-w-0 lg:col-span-2 2xl:col-span-6"
          contentClassName="min-w-0 pt-1 sm:pt-2"
        >
          <DualAxisLineChart
            data={data.salesOverview.data}
            leftLabel={data.salesOverview.revenueLabel}
            rightLabel={data.salesOverview.ordersLabel}
            leftFormatter={(value) => formatCurrency(value, { compact: true })}
            rightFormatter={(value) => value.toLocaleString('en-BD')}
          />
        </DashboardCard>

        <DashboardCard
          title={data.ordersStatus.title}
          action={
            <PeriodFilter
              value={ordersStatusPeriod}
              onChange={setOrdersStatusPeriod}
            />
          }
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
        >
          <DonutChart
            segments={orderStatusSegments}
            centerValue={totalOrders.toLocaleString('en-BD')}
            centerLabel={['Total', 'Orders']}
            height={200}
            legendPosition="responsive"
            legendVariant="value-percent"
          />
        </DashboardCard>

        <DashboardCard
          title={data.roleDistribution.title}
          action={<PeriodFilter value={rolePeriod} onChange={setRolePeriod} />}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
        >
          <DonutChart
            segments={roleSegments}
            centerValue={totalUsers.toLocaleString('en-BD')}
            centerLabel={['Total', 'Users']}
            height={200}
            legendPosition="responsive"
            legendVariant="value-percent"
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-12">
        <DashboardCard
          title={data.monthlyRevenue.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-4"
        >
          <SimpleBarChart
            data={data.monthlyRevenue.data}
            color="#8B5CF6"
            showValueLabels
            valueFormatter={(value) => formatCurrency(value, { compact: true })}
            size="lg"
          />
        </DashboardCard>

        <DashboardCard
          title={data.recentUsers.title}
          action={
            <CardLinkAction href="/dashboard/users" label="View All Users" />
          }
          className="min-w-0 lg:col-span-2 2xl:col-span-5"
          contentClassName="pt-0"
          footer={usersViewMore.footer}
        >
          <div className={TABLE_SCROLL_CLASS}>
            <RecentUsersTable rows={usersViewMore.visibleItems} />
          </div>
        </DashboardCard>

        <DashboardCard
          title={data.systemHealth.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
        >
          <SystemHealthList items={data.systemHealth.items} />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-12">
        <DashboardCard
          title={data.topAgents.title}
          action={
            <CardLinkAction href="/dashboard/agents" label="View All Agents" />
          }
          className="min-w-0 sm:col-span-2 2xl:col-span-4"
          contentClassName="pt-0"
          footer={agentsViewMore.footer}
        >
          <div className={TABLE_SCROLL_CLASS}>
            <TopAgentsTable rows={agentsViewMore.visibleItems} />
          </div>
        </DashboardCard>

        <DashboardCard
          title={data.recentActivities.title}
          className="min-w-0 2xl:col-span-3"
          footer={activitiesViewMore.footer}
        >
          <AgentActivityFeed items={activitiesViewMore.visibleItems} />
        </DashboardCard>

        <DashboardCard
          title={data.leadSources.title}
          action={
            <PeriodFilter
              value={leadSourcesPeriod}
              onChange={setLeadSourcesPeriod}
            />
          }
          className="min-w-0 2xl:col-span-3"
        >
          <DonutChart
            segments={leadSourceSegments}
            centerValue={totalLeads.toLocaleString('en-BD')}
            centerLabel={['Total', 'Leads']}
            height={200}
            legendPosition="responsive"
            legendVariant="value-percent"
          />
        </DashboardCard>

        <DashboardCard
          title={data.storageUsage.title}
          className="min-w-0 2xl:col-span-2"
        >
          <StorageUsageChart usage={data.storageUsage.usage} />
        </DashboardCard>
      </div>
    </div>
  );
}
