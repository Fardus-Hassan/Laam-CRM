'use client';

import * as React from 'react';
import type { AgentDashboard } from '@laam/types';

import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { CardLinkAction } from '@/components/dashboard/card-link-action';
import { KpiStatGrid } from '@/components/dashboard/kpi-stat-card';
import { ScoreBoardCard } from '@/components/dashboard/score-board-card';
import { IncentiveSummaryCard } from '@/components/dashboard/incentive-summary-card';
import { LeaderboardList } from '@/components/dashboard/leaderboard-list';
import { AlertFeed } from '@/components/dashboard/alert-feed';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { DonutChart } from '@/components/charts/donut-chart';
import { SimpleBarChart } from '@/components/charts/simple-bar-chart';
import { DateRangePicker } from '@/components/date-range/date-range-picker';
import { useDashboardDate } from '@/features/dashboard/providers/dashboard-date-provider';
import { useViewMore } from '@/features/dashboard/hooks/use-view-more';
import {
  transformChartPoints,
  transformDonutSegments,
  transformAgentRows,
} from '@/features/dashboard/lib/period-data';
import type { DashboardPeriod } from '@/features/dashboard/types/period';
import {
  AgentOrdersTable,
  FollowUpsTable,
  IncentiveHistoryTable,
} from '@/features/dashboard/components/tables/agent-tables';
import { DashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';

type AgentDashboardViewProps = {
  data: AgentDashboard;
};

const TABLE_SCROLL_CLASS =
  'custom-scrollbar -mx-3 overflow-x-auto px-3 sm:-mx-5 sm:px-5';

export function AgentDashboardView({ data }: AgentDashboardViewProps) {
  const { range, setRange } = useDashboardDate();

  const [ordersTrendPeriod, setOrdersTrendPeriod] =
    React.useState<DashboardPeriod>('week');
  const [orderStatusPeriod, setOrderStatusPeriod] =
    React.useState<DashboardPeriod>('week');
  const [leaderboardPeriod, setLeaderboardPeriod] =
    React.useState<DashboardPeriod>('week');

  const ordersViewMore = useViewMore(data.myOrders.rows, 5);
  const followUpsViewMore = useViewMore(data.followUps.rows, 4);
  const incentiveHistoryViewMore = useViewMore(data.incentiveHistory.rows, 4);
  const notificationsViewMore = useViewMore(data.notifications.items, 4);
  const leaderboardViewMore = useViewMore(data.leaderboard.rows, 5);

  const ordersTrendData = React.useMemo(
    () => transformChartPoints(data.ordersTrend.data, ordersTrendPeriod),
    [data.ordersTrend.data, ordersTrendPeriod],
  );

  const orderStatusSegments = React.useMemo(
    () => transformDonutSegments(data.orderStatus.segments, orderStatusPeriod),
    [data.orderStatus.segments, orderStatusPeriod],
  );

  const leaderboardRows = React.useMemo(
    () =>
      transformAgentRows(leaderboardViewMore.visibleItems, leaderboardPeriod),
    [leaderboardViewMore.visibleItems, leaderboardPeriod],
  );

  const totalOrders =
    orderStatusPeriod === 'week'
      ? data.orderStatus.totalOrders
      : orderStatusSegments.reduce((sum, segment) => sum + segment.value, 0);

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

      <DashboardWidget widget="kpis">
        <KpiStatGrid metrics={data.kpis} columns={6} />
      </DashboardWidget>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-12">
        <DashboardWidget widget="orders">
          <DashboardCard
            title={data.myOrders.title}
          action={
            <CardLinkAction href="/dashboard/orders" label="View All Orders" />
          }
          className="min-w-0 lg:col-span-2 2xl:col-span-6"
          contentClassName="pt-0"
          footer={ordersViewMore.footer}
        >
          <div className={TABLE_SCROLL_CLASS}>
            <AgentOrdersTable rows={ordersViewMore.visibleItems} />
          </div>
        </DashboardCard>
        </DashboardWidget>

        <DashboardCard
          title={data.scoreBoard.title}
          className="min-w-0 h-full lg:col-span-1 2xl:col-span-3"
        >
          <ScoreBoardCard data={data.scoreBoard.data} />
        </DashboardCard>

        <DashboardCard
          title={data.incentive.title}
          className="min-w-0 h-full lg:col-span-1 2xl:col-span-3"
        >
          <IncentiveSummaryCard data={data.incentive.data} />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-12">
        <DashboardWidget widget="orders">
          <DashboardCard
            title={data.orderStatus.title}
          action={
            <PeriodFilter
              value={orderStatusPeriod}
              onChange={setOrderStatusPeriod}
            />
          }
          className="min-w-0 lg:col-span-1 2xl:col-span-4"
        >
          <DonutChart
            segments={orderStatusSegments}
            centerValue={String(totalOrders)}
            centerLabel="Total Orders"
            height={200}
            legendPosition="responsive"
          />
        </DashboardCard>
        </DashboardWidget>

        <DashboardWidget widget="orders">
          <DashboardCard
            title={`${data.ordersTrend.title} (${data.ordersTrend.periodLabel})`}
          action={
            <PeriodFilter
              value={ordersTrendPeriod}
              onChange={setOrdersTrendPeriod}
            />
          }
          className="min-w-0 lg:col-span-1 2xl:col-span-4"
          contentClassName="min-w-0 pt-1 sm:pt-2"
        >
          <SimpleBarChart data={ordersTrendData} />
        </DashboardCard>
        </DashboardWidget>

        <DashboardWidget widget="team">
          <DashboardCard
            title={data.leaderboard.title}
          action={
            <>
              <PeriodFilter
                value={leaderboardPeriod}
                onChange={setLeaderboardPeriod}
              />
              <CardLinkAction
                href="/dashboard/leaderboard"
                label="View Full Leaderboard"
              />
            </>
          }
          className="min-w-0 lg:col-span-2 2xl:col-span-4"
          footer={leaderboardViewMore.footer}
        >
          <LeaderboardList rows={leaderboardRows} />
        </DashboardCard>
        </DashboardWidget>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-12">
        <DashboardCard
          title={data.followUps.title}
          className="min-w-0 lg:col-span-2 2xl:col-span-5"
          contentClassName="pt-0"
          footer={followUpsViewMore.footer}
        >
          <div className={TABLE_SCROLL_CLASS}>
            <FollowUpsTable rows={followUpsViewMore.visibleItems} />
          </div>
        </DashboardCard>

        <DashboardCard
          title={data.incentiveHistory.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-4"
          contentClassName="pt-0"
          footer={incentiveHistoryViewMore.footer}
        >
          <div className={TABLE_SCROLL_CLASS}>
            <IncentiveHistoryTable rows={incentiveHistoryViewMore.visibleItems} />
          </div>
        </DashboardCard>

        <DashboardCard
          title={data.notifications.title}
          action={
            <CardLinkAction href="/dashboard/notifications" label="View All" />
          }
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
          footer={notificationsViewMore.footer}
        >
          <AlertFeed items={notificationsViewMore.visibleItems} />
        </DashboardCard>
      </div>
    </div>
  );
}
