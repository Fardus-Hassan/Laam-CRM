'use client';

import * as React from 'react';
import type { CeoDashboard } from '@laam/types';
import {
  Building2,
  LineChart,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { KpiStatGrid } from '@/components/dashboard/kpi-stat-card';
import { CompactStatGrid } from '@/components/dashboard/compact-stat-grid';
import { MetricRowList } from '@/components/dashboard/metric-row-list';
import { AlertFeed } from '@/components/dashboard/alert-feed';
import { GoalBreakdownList } from '@/components/dashboard/goal-breakdown-list';
import {
  MarketMetricList,
  SparklineMetricList,
} from '@/components/dashboard/market-metric-list';
import { DualAxisComboChart } from '@/components/charts/dual-axis-combo-chart';
import { PerformanceGaugeChart } from '@/components/charts/performance-gauge-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { DateRangePicker } from '@/components/date-range/date-range-picker';
import { Progress } from '@/components/ui/progress';
import { useDashboardDate } from '@/features/dashboard/providers/dashboard-date-provider';
import { useViewMore } from '@/features/dashboard/hooks/use-view-more';
import { formatCurrency } from '@/lib/format';
import {
  CeoDepartmentTable,
  CeoTopTeamsTable,
} from '@/features/dashboard/components/tables/ceo-tables';
import { DashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';
import { cn } from '@/lib/utils';

type CeoDashboardViewProps = {
  data: CeoDashboard;
};

const TABLE_SCROLL_CLASS =
  'custom-scrollbar -mx-3 overflow-x-auto px-3 sm:-mx-5 sm:px-5';

const HIGHLIGHT_ICONS: Record<string, LucideIcon> = {
  'trending-up': TrendingUp,
  target: Target,
  users: Users,
  'line-chart': LineChart,
  'building-2': Building2,
};

export function CeoDashboardView({ data }: CeoDashboardViewProps) {
  const { range, setRange } = useDashboardDate();

  const deptViewMore = useViewMore(data.departmentPerformance.rows, 4);
  const teamsViewMore = useViewMore(data.topTeams.rows, 4);
  const alertsViewMore = useViewMore(data.alerts.items, 4);

  const unitTotal = React.useMemo(
    () => data.revenueByUnit.segments.reduce((sum, segment) => sum + segment.value, 0),
    [data.revenueByUnit.segments],
  );

  const goalSegments = React.useMemo(
    () => [
      {
        id: 'achieved',
        label: 'Achieved',
        value: data.goalAchievement.breakdown.achieved,
        percent: data.goalAchievement.overallPercent,
        color: '#22C55E',
      },
      {
        id: 'remaining',
        label: 'Remaining',
        value:
          data.goalAchievement.breakdown.total -
          data.goalAchievement.breakdown.achieved,
        percent: 100 - data.goalAchievement.overallPercent,
        color: '#E2E8F0',
      },
    ],
    [data.goalAchievement],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            {data.title}
          </h2>
          {data.welcomeMessage ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {data.welcomeMessage}
              {data.subtitle ? (
                <span className="text-foreground"> · {data.subtitle}</span>
              ) : null}
            </p>
          ) : data.subtitle ? (
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

      <DashboardWidget widget="revenue">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2 2xl:grid-cols-12">
        <DashboardCard
          title={data.revenueOverview.title}
          className="min-w-0 xl:col-span-1 2xl:col-span-4"
          contentClassName="min-w-0"
        >
          <DualAxisComboChart
            data={data.revenueOverview.data}
            barLabel={data.revenueOverview.barLabel}
            lineLabel={data.revenueOverview.lineLabel}
            barFormatter={(value) => formatCurrency(value, { compact: true })}
            lineFormatter={(value) => formatCurrency(value, { compact: true })}
          />
        </DashboardCard>

        <DashboardCard
          title={data.businessPerformance.title}
          className="min-w-0 xl:col-span-1 2xl:col-span-4"
        >
          <div className="flex flex-col gap-4 @container">
            <div className="flex flex-col items-center gap-4 @min-[20rem]:flex-row @min-[20rem]:items-start">
              <div className="mx-auto w-full max-w-[180px] shrink-0 sm:max-w-[200px]">
                <PerformanceGaugeChart
                  percent={data.businessPerformance.performancePercent}
                  label={data.businessPerformance.performanceLabel}
                  size={180}
                />
              </div>
              <div className="w-full min-w-0 flex-1 space-y-3">
                <MetricRowList metrics={data.businessPerformance.metrics} />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Target Achievement</span>
                    <span className="font-semibold">
                      {data.businessPerformance.achievementPercent}%
                    </span>
                  </div>
                  <Progress
                    value={data.businessPerformance.achievementPercent}
                    className="h-2.5 bg-muted"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-border/70 pt-3 sm:grid-cols-4">
              {data.businessPerformance.highlights.map((item) => {
                const Icon = item.icon ? HIGHLIGHT_ICONS[item.icon] : undefined;

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-center"
                  >
                    {Icon ? (
                      <Icon className="mx-auto size-4 text-primary" />
                    ) : null}
                    <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title={data.revenueByUnit.title}
          className="min-w-0 xl:col-span-2 2xl:col-span-4"
        >
          <DonutChart
            segments={data.revenueByUnit.segments}
            centerValue={formatCurrency(unitTotal, { compact: true })}
            centerLabel={data.revenueByUnit.totalLabel}
            height={200}
            legendPosition="responsive"
            legendVariant="value-percent"
          />
        </DashboardCard>
      </div>
      </DashboardWidget>

      <DashboardWidget widget="team">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2 2xl:grid-cols-12">
        <DashboardCard
          title={data.departmentPerformance.title}
          className="min-w-0 xl:col-span-1 2xl:col-span-4"
          contentClassName="pt-0"
          footer={deptViewMore.footer}
        >
          <div className={TABLE_SCROLL_CLASS}>
            <CeoDepartmentTable rows={deptViewMore.visibleItems} />
          </div>
        </DashboardCard>

        <DashboardCard
          title={data.salesTrend.title}
          className="min-w-0 xl:col-span-1 2xl:col-span-4"
          contentClassName="min-w-0"
        >
          <DualAxisComboChart
            data={data.salesTrend.data}
            barLabel={data.salesTrend.barLabel}
            lineLabel={data.salesTrend.lineLabel}
            barFormatter={(value) => formatCurrency(value, { compact: true })}
          />
        </DashboardCard>

        <DashboardCard
          title={data.topTeams.title}
          className="min-w-0 xl:col-span-2 2xl:col-span-4"
          contentClassName="pt-0"
          footer={teamsViewMore.footer}
        >
          <div className={TABLE_SCROLL_CLASS}>
            <CeoTopTeamsTable rows={teamsViewMore.visibleItems} />
          </div>
        </DashboardCard>
      </div>
      </DashboardWidget>

      <DashboardWidget widget="marketing">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <DashboardCard title={data.marketOverview.title} className="min-w-0">
          <MarketMetricList items={data.marketOverview.items} />
        </DashboardCard>

        <DashboardCard title={data.executiveKpis.title} className="min-w-0">
          <SparklineMetricList items={data.executiveKpis.items} />
        </DashboardCard>

        <DashboardCard title={data.goalAchievement.title} className="min-w-0">
          <div className="flex flex-col items-center gap-4">
            <div className="mx-auto w-full max-w-[200px] sm:max-w-[220px]">
              <DonutChart
                segments={goalSegments}
                centerValue={`${data.goalAchievement.overallPercent}%`}
                centerLabel={['Overall', 'Achievement']}
                height={200}
                innerRadius="58%"
                showLegend={false}
              />
            </div>
            <GoalBreakdownList
              breakdown={data.goalAchievement.breakdown}
              className="w-full border-t border-border/70 pt-4"
            />
          </div>
        </DashboardCard>

        <DashboardCard title={data.financialOverview.title} className="min-w-0">
          <MetricRowList metrics={data.financialOverview.items} />
        </DashboardCard>

        <DashboardCard
          title={data.alerts.title}
          className={cn('min-w-0 sm:col-span-2 xl:col-span-1 2xl:col-span-1')}
          footer={alertsViewMore.footer}
        >
          <AlertFeed items={alertsViewMore.visibleItems} />
        </DashboardCard>
      </div>
      </DashboardWidget>

      <DashboardWidget widget="kpis">
        <CompactStatGrid metrics={data.footerStats} />
      </DashboardWidget>
    </div>
  );
}
