'use client';

import * as React from 'react';
import type { TeamLeaderDashboard } from '@laam/types';

import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { CardLinkAction } from '@/components/dashboard/card-link-action';
import { KpiStatGrid } from '@/components/dashboard/kpi-stat-card';
import { ScoreBoardCard } from '@/components/dashboard/score-board-card';
import { IncentiveSummaryCard } from '@/components/dashboard/incentive-summary-card';
import { AgentActivityFeed } from '@/components/dashboard/agent-activity-feed';
import { TeamTargetProgressCard } from '@/components/dashboard/team-target-progress-card';
import { AlertFeed } from '@/components/dashboard/alert-feed';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { MultiLineChart } from '@/components/charts/multi-line-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { DateRangePicker } from '@/components/date-range/date-range-picker';
import { useDashboardDate } from '@/features/dashboard/providers/dashboard-date-provider';
import { useViewMore } from '@/features/dashboard/hooks/use-view-more';
import { DashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';
import {
  transformChartSeries,
  transformDonutSegments,
  scaleMetricValue,
} from '@/features/dashboard/lib/period-data';
import type { DashboardPeriod } from '@/features/dashboard/types/period';
import { TeamAgentsTable } from '@/features/dashboard/components/tables/team-leader-tables';
import { DASHBOARD_GRID_LG_12, DASHBOARD_GRID_LG_12_SM2 } from '@/features/dashboard/lib/dashboard-grid';

type TeamLeaderDashboardViewProps = {
  data: TeamLeaderDashboard;
};

const TABLE_SCROLL_CLASS =
  'custom-scrollbar -mx-3 overflow-x-auto px-3 sm:-mx-5 sm:px-5';

export function TeamLeaderDashboardView({ data }: TeamLeaderDashboardViewProps) {
  const { range, setRange } = useDashboardDate();

  const [performancePeriod, setPerformancePeriod] =
    React.useState<DashboardPeriod>('week');
  const [orderStatusPeriod, setOrderStatusPeriod] =
    React.useState<DashboardPeriod>('week');
  const [followUpPeriod, setFollowUpPeriod] = React.useState<DashboardPeriod>('week');

  const agentsViewMore = useViewMore(data.agentPerformance.rows, 5);
  const activitiesViewMore = useViewMore(data.activities.items, 4);
  const notificationsViewMore = useViewMore(data.notifications.items, 4);

  const performanceSeries = React.useMemo(
    () => transformChartSeries(data.teamPerformance.series, performancePeriod),
    [data.teamPerformance.series, performancePeriod],
  );

  const orderStatusSegments = React.useMemo(
    () => transformDonutSegments(data.orderStatus.segments, orderStatusPeriod),
    [data.orderStatus.segments, orderStatusPeriod],
  );

  const followUpSegments = React.useMemo(
    () => transformDonutSegments(data.followUpOverview.segments, followUpPeriod),
    [data.followUpOverview.segments, followUpPeriod],
  );

  const totalOrders = React.useMemo(
    () => scaleMetricValue(data.orderStatus.totalOrders, orderStatusPeriod),
    [data.orderStatus.totalOrders, orderStatusPeriod],
  );

  const totalFollowUps = React.useMemo(
    () => scaleMetricValue(data.followUpOverview.totalFollowUps, followUpPeriod),
    [data.followUpOverview.totalFollowUps, followUpPeriod],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            {data.title}
          </h2>
          {data.subtitle ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {data.subtitle}
              {data.teamName ? (
                <span className="text-foreground">
                  {' '}
                  · {data.teamName}
                  {data.teamSize ? ` · Team Size: ${data.teamSize} Agents` : ''}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <DateRangePicker
          value={range}
          onChange={setRange}
          align="end"
          className="w-full sm:w-auto"
        />
      </div>

      <DashboardWidget widget="kpis">
        <KpiStatGrid metrics={data.kpis} columns={6} />
      </DashboardWidget>

      <DashboardWidget widget="team">
      <div className={DASHBOARD_GRID_LG_12}>
        <DashboardCard
          title={data.teamPerformance.title}
          action={
            <PeriodFilter
              value={performancePeriod}
              onChange={setPerformancePeriod}
            />
          }
          className="min-w-0 lg:col-span-2 2xl:col-span-6"
          contentClassName="min-w-0 pt-1 sm:pt-2"
        >
          <MultiLineChart series={performanceSeries} />
        </DashboardCard>

        <DashboardCard
          title={data.scoreBoard.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
        >
          <ScoreBoardCard data={data.scoreBoard.data} rankLabel="Team Rank" />
        </DashboardCard>

        <DashboardCard
          title={data.incentive.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
        >
          <IncentiveSummaryCard data={data.incentive.data} />
        </DashboardCard>
      </div>
      </DashboardWidget>

      <DashboardWidget widget="team">
      <div className={DASHBOARD_GRID_LG_12}>
        <DashboardCard
          title={data.agentPerformance.title}
          action={
            <CardLinkAction href="/dashboard/team" label="View All Agents" />
          }
          className="min-w-0 lg:col-span-2 2xl:col-span-7"
          contentClassName="pt-0"
          footer={agentsViewMore.footer}
        >
          <div className={TABLE_SCROLL_CLASS}>
            <TeamAgentsTable rows={agentsViewMore.visibleItems} />
          </div>
        </DashboardCard>

        <DashboardCard
          title={data.activities.title}
          className="min-w-0 lg:col-span-2 2xl:col-span-5"
          footer={activitiesViewMore.footer}
        >
          <AgentActivityFeed items={activitiesViewMore.visibleItems} />
        </DashboardCard>
      </div>
      </DashboardWidget>

      <div className={DASHBOARD_GRID_LG_12_SM2}>
        <DashboardWidget widget="orders" className="min-w-0 2xl:col-span-3">
          <DashboardCard
            title={data.orderStatus.title}
          action={
            <PeriodFilter
              value={orderStatusPeriod}
              onChange={setOrderStatusPeriod}
            />
          }
          className="min-w-0"
        >
          <DonutChart
            segments={orderStatusSegments}
            centerValue={totalOrders.toLocaleString('en-BD')}
            centerLabel="Total Orders"
            height={200}
            legendPosition="responsive"
            legendVariant="value-percent"
          />
        </DashboardCard>
        </DashboardWidget>

        <DashboardCard
          title={data.followUpOverview.title}
          action={
            <PeriodFilter value={followUpPeriod} onChange={setFollowUpPeriod} />
          }
          className="min-w-0 2xl:col-span-3"
        >
          <DonutChart
            segments={followUpSegments}
            centerValue={totalFollowUps.toLocaleString('en-BD')}
            centerLabel={['Total', 'Follow Ups']}
            height={200}
            legendPosition="responsive"
            legendVariant="value-percent"
          />
        </DashboardCard>

        <DashboardCard
          title={data.teamTargets.title}
          className="min-w-0 2xl:col-span-3"
        >
          <TeamTargetProgressCard
            overall={data.teamTargets.overall}
            subTargets={data.teamTargets.subTargets}
          />
        </DashboardCard>

        <DashboardCard
          title={data.notifications.title}
          action={
            <CardLinkAction href="/dashboard/notifications" label="View All" />
          }
          className="min-w-0 2xl:col-span-3"
          footer={notificationsViewMore.footer}
        >
          <AlertFeed items={notificationsViewMore.visibleItems} />
        </DashboardCard>
      </div>
    </div>
  );
}
