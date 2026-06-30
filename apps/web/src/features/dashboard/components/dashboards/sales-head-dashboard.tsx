'use client';

import * as React from 'react';
import type { AgentRankRow, SalesHeadDashboard } from '@laam/types';

import { formatCurrency } from '@/lib/format';
import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { KpiStatGrid } from '@/components/dashboard/kpi-stat-card';
import { MetricRowList } from '@/components/dashboard/metric-row-list';
import { AgentRankList } from '@/components/dashboard/agent-rank-list';
import { AlertFeed } from '@/components/dashboard/alert-feed';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { MultiLineChart } from '@/components/charts/multi-line-chart';
import { SimpleBarChart } from '@/components/charts/simple-bar-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { DateRangePicker } from '@/components/date-range/date-range-picker';
import { useDashboardDate } from '@/features/dashboard/providers/dashboard-date-provider';
import { useViewMore } from '@/features/dashboard/hooks/use-view-more';
import {
  transformAgentRows,
  transformChartPoints,
  transformChartSeries,
  transformDonutSegments,
  transformMonthlyRevenue,
  transformTeamRows,
  scaleMetricValue,
} from '@/features/dashboard/lib/period-data';
import type { DashboardPeriod } from '@/features/dashboard/types/period';
import {
  DepartmentTargetsTable,
  TeamPerformanceTable,
} from '@/features/dashboard/components/tables/dashboard-tables';
import { DASHBOARD_GRID_LG_12 } from '@/features/dashboard/lib/dashboard-grid';
import { DashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';

type SalesHeadDashboardViewProps = {
  data: SalesHeadDashboard;
};

type MonthYearPeriod = 'month' | 'year';

const TABLE_SCROLL_CLASS =
  'custom-scrollbar -mx-3 overflow-x-auto px-3 sm:-mx-5 sm:px-5';

export function SalesHeadDashboardView({ data }: SalesHeadDashboardViewProps) {
  const { range, setRange } = useDashboardDate();
  const chartTheme = useChartTheme();
  const summary = data.revenueTarget.summary;

  const [salesTrendPeriod, setSalesTrendPeriod] =
    React.useState<DashboardPeriod>('week');
  const [achievementPeriod, setAchievementPeriod] =
    React.useState<DashboardPeriod>('week');
  const [agentsPeriod, setAgentsPeriod] = React.useState<DashboardPeriod>('week');
  const [orderStatusPeriod, setOrderStatusPeriod] =
    React.useState<DashboardPeriod>('week');
  const [teamPeriod, setTeamPeriod] = React.useState<MonthYearPeriod>('month');
  const [deptPeriod, setDeptPeriod] = React.useState<MonthYearPeriod>('month');
  const [revenuePeriod, setRevenuePeriod] =
    React.useState<MonthYearPeriod>('month');

  const teamViewMore = useViewMore(data.teamPerformance.rows, 3);
  const agentsViewMore = useViewMore(data.topAgents.rows, 3);
  const deptViewMore = useViewMore(data.departmentTargets.rows, 3);
  const alertsViewMore = useViewMore(data.alerts.items, 3);

  const salesTrendSeries = React.useMemo(
    () => transformChartSeries(data.salesTrend.series, salesTrendPeriod),
    [data.salesTrend.series, salesTrendPeriod],
  );

  const achievementData = React.useMemo(
    () =>
      transformChartPoints(data.revenueTarget.dailyAchievement, achievementPeriod),
    [data.revenueTarget.dailyAchievement, achievementPeriod],
  );

  const monthlyRevenueData = React.useMemo(() => {
    const period: DashboardPeriod =
      revenuePeriod === 'month' ? 'month' : 'year';
    return transformMonthlyRevenue(data.monthlyRevenue.data, period);
  }, [data.monthlyRevenue.data, revenuePeriod]);

  const orderStatusSegments = React.useMemo(
    () => transformDonutSegments(data.orderStatus.segments, orderStatusPeriod),
    [data.orderStatus.segments, orderStatusPeriod],
  );

  const totalSales = React.useMemo(
    () => scaleMetricValue(data.orderStatus.totalSales, orderStatusPeriod),
    [data.orderStatus.totalSales, orderStatusPeriod],
  );

  const teamRows = React.useMemo(() => {
    const period: DashboardPeriod = teamPeriod === 'month' ? 'month' : 'year';
    return transformTeamRows(teamViewMore.visibleItems, period);
  }, [teamViewMore.visibleItems, teamPeriod]);

  const agentRows = React.useMemo(
    () =>
      transformAgentRows(
        agentsViewMore.visibleItems as AgentRankRow[],
        agentsPeriod,
      ),
    [agentsViewMore.visibleItems, agentsPeriod],
  );

  const deptRows = React.useMemo(() => {
    if (deptPeriod === 'month') {
      return deptViewMore.visibleItems;
    }

    return deptViewMore.visibleItems.map((row) => ({
      ...row,
      monthlyTarget: scaleMetricValue(row.monthlyTarget, 'year'),
      achieved: scaleMetricValue(row.achieved, 'year'),
    }));
  }, [deptViewMore.visibleItems, deptPeriod]);

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
        <KpiStatGrid metrics={data.kpis} />
      </DashboardWidget>

      <div className={DASHBOARD_GRID_LG_12}>
        <DashboardCard
          title={data.salesTrend.title}
          action={
            <PeriodFilter
              value={salesTrendPeriod}
              onChange={setSalesTrendPeriod}
            />
          }
          className="min-w-0 lg:col-span-2 2xl:col-span-5"
          contentClassName="min-w-0 pt-1 sm:pt-2"
        >
          <MultiLineChart series={salesTrendSeries} />
        </DashboardCard>

        <DashboardWidget widget="revenue" className="min-w-0 lg:col-span-1 2xl:col-span-4">
          <DashboardCard
            title={data.revenueTarget.title}
            className="min-w-0"
          >
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
              <div className="h-[140px] w-[140px] shrink-0 sm:h-[148px] sm:w-[148px]">
                <DonutChart
                  segments={[
                    {
                      id: 'achieved',
                      label: 'Achieved',
                      value: summary.achieved,
                      percent: summary.achievementPercent,
                      color: '#127A3B',
                    },
                    {
                      id: 'remaining',
                      label: 'Remaining',
                      value: summary.remaining,
                      percent: 100 - summary.achievementPercent,
                      color: chartTheme.donutTrack,
                    },
                  ]}
                  centerValue={`${summary.achievementPercent}%`}
                  centerLabel="Achievement"
                  height={148}
                  showLegend={false}
                  showTooltip={false}
                  className="h-full"
                />
              </div>

              <div
                className="hidden w-px shrink-0 bg-border/70 sm:block"
                aria-hidden
              />

              <dl className="flex w-full min-w-0 flex-col justify-center divide-y divide-border/70 sm:flex-1">
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">Target</dt>
                  <dd className="text-right text-sm font-semibold">
                    {formatCurrency(summary.target)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">Achieved</dt>
                  <dd className="text-right text-sm font-semibold text-primary">
                    {formatCurrency(summary.achieved)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">Remaining</dt>
                  <dd className="text-right text-sm font-semibold">
                    {formatCurrency(summary.remaining)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="border-t border-border/70 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Daily Achievement Trend
                </p>
                <PeriodFilter
                  value={achievementPeriod}
                  onChange={setAchievementPeriod}
                />
              </div>
              <SimpleBarChart
                data={achievementData}
                size="sm"
                valueFormatter={(value) => `${value}%`}
                color="#8CC63F"
              />
            </div>
          </div>
        </DashboardCard>
        </DashboardWidget>

        <DashboardCard
          title={data.overallPerformance.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
        >
          <MetricRowList metrics={data.overallPerformance.metrics} />
        </DashboardCard>
      </div>

      <div className={DASHBOARD_GRID_LG_12}>
        <DashboardWidget widget="team" className="min-w-0 lg:col-span-2 2xl:col-span-6">
          <DashboardCard
            title={data.teamPerformance.title}
          action={
            <PeriodFilter
              value={teamPeriod}
              onChange={(period) => setTeamPeriod(period as MonthYearPeriod)}
              options={['month', 'year']}
            />
          }
          className="min-w-0"
          contentClassName={TABLE_SCROLL_CLASS}
          footer={teamViewMore.footer}
        >
          <TeamPerformanceTable rows={teamRows} />
        </DashboardCard>
        </DashboardWidget>

        <DashboardWidget widget="team" className="min-w-0 lg:col-span-1 2xl:col-span-3">
          <DashboardCard
            title={data.topAgents.title}
          action={
            <PeriodFilter value={agentsPeriod} onChange={setAgentsPeriod} />
          }
          className="min-w-0"
          footer={agentsViewMore.footer}
        >
          <AgentRankList rows={agentRows} />
        </DashboardCard>
        </DashboardWidget>

        <DashboardWidget widget="orders" className="min-w-0 lg:col-span-1 2xl:col-span-3">
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
            centerValue={totalSales.toLocaleString('en-BD')}
            centerLabel="Total Sales"
            height={180}
            legendPosition="responsive"
          />
        </DashboardCard>
        </DashboardWidget>
      </div>

      <div className={DASHBOARD_GRID_LG_12}>
        <DashboardCard
          title={data.departmentTargets.title}
          action={
            <PeriodFilter
              value={deptPeriod}
              onChange={(period) => setDeptPeriod(period as MonthYearPeriod)}
              options={['month', 'year']}
            />
          }
          className="min-w-0 lg:col-span-2 2xl:col-span-5"
          contentClassName={TABLE_SCROLL_CLASS}
          footer={deptViewMore.footer}
        >
          <DepartmentTargetsTable rows={deptRows} />
        </DashboardCard>

        <DashboardWidget widget="revenue" className="min-w-0 lg:col-span-1 2xl:col-span-4">
          <DashboardCard
            title={data.monthlyRevenue.title}
          action={
            <PeriodFilter
              value={revenuePeriod}
              onChange={(period) => setRevenuePeriod(period as MonthYearPeriod)}
              options={['month', 'year']}
            />
          }
          className="min-w-0"
        >
          <SimpleBarChart data={monthlyRevenueData} size="lg" />
        </DashboardCard>
        </DashboardWidget>

        <DashboardCard
          title={data.alerts.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
          footer={alertsViewMore.footer}
        >
          <AlertFeed items={alertsViewMore.visibleItems} />
        </DashboardCard>
      </div>
    </div>
  );
}
