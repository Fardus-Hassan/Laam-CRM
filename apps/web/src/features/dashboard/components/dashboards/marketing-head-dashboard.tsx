'use client';

import * as React from 'react';
import type { MarketingHeadDashboard } from '@laam/types';

import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { CardLinkAction } from '@/components/dashboard/card-link-action';
import { KpiStatGrid } from '@/components/dashboard/kpi-stat-card';
import { AlertFeed } from '@/components/dashboard/alert-feed';
import { InsightList } from '@/components/dashboard/insight-list';
import { LeadQualityList } from '@/components/dashboard/lead-quality-list';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { MultiLineChart } from '@/components/charts/multi-line-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { FunnelChart } from '@/components/charts/funnel-chart';
import { ComboBarLineChart } from '@/components/charts/combo-bar-line-chart';
import { BudgetOverviewChart } from '@/components/charts/budget-overview-chart';
import { MonthlyLeadsChart } from '@/components/charts/monthly-leads-chart';
import { DateRangePicker } from '@/components/date-range/date-range-picker';
import { useDashboardDate } from '@/features/dashboard/providers/dashboard-date-provider';
import { useViewMore } from '@/features/dashboard/hooks/use-view-more';
import {
  transformChartSeries,
  transformDonutSegments,
} from '@/features/dashboard/lib/period-data';
import type { DashboardPeriod } from '@/features/dashboard/types/period';
import { CampaignPerformanceTable } from '@/features/dashboard/components/tables/marketing-tables';
import { DashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';

type MarketingHeadDashboardViewProps = {
  data: MarketingHeadDashboard;
};

const TABLE_SCROLL_CLASS =
  'custom-scrollbar -mx-3 overflow-x-auto px-3 sm:-mx-5 sm:px-5';

export function MarketingHeadDashboardView({
  data,
}: MarketingHeadDashboardViewProps) {
  const { range, setRange } = useDashboardDate();

  const [leadsTrendPeriod, setLeadsTrendPeriod] =
    React.useState<DashboardPeriod>('week');
  const [budgetPeriod, setBudgetPeriod] = React.useState<DashboardPeriod>('month');

  const campaignsViewMore = useViewMore(data.campaigns.rows, 4);
  const activitiesViewMore = useViewMore(data.activities.items, 4);
  const insightsViewMore = useViewMore(data.insights.items, 4);

  const leadsTrendSeries = React.useMemo(
    () => transformChartSeries(data.leadsTrend.series, leadsTrendPeriod),
    [data.leadsTrend.series, leadsTrendPeriod],
  );

  const leadSourceSegments = React.useMemo(
    () => transformDonutSegments(data.leadSources.segments, leadsTrendPeriod),
    [data.leadSources.segments, leadsTrendPeriod],
  );

  const leadSourceTotal = React.useMemo(
    () => data.leadSources.segments.reduce((sum, segment) => sum + segment.value, 0),
    [data.leadSources.segments],
  );

  const budgetSummary = React.useMemo(() => {
    if (budgetPeriod === 'week') {
      return data.budget.summary;
    }

    const factor = budgetPeriod === 'month' ? 1 : 12;
    return {
      ...data.budget.summary,
      achieved: Math.round(data.budget.summary.achieved * factor),
      remaining: Math.max(
        0,
        data.budget.summary.target * factor - data.budget.summary.achieved * factor,
      ),
      achievementPercent: Math.min(
        100,
        Math.round(
          ((data.budget.summary.achieved * factor) /
            (data.budget.summary.target * factor)) *
            100,
        ),
      ),
    };
  }, [data.budget.summary, budgetPeriod]);

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
        <KpiStatGrid metrics={data.kpis} columns={7} />
      </DashboardWidget>

      <DashboardWidget widget="leads">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-12">
        <DashboardCard
          title={data.leadsTrend.title}
          action={
            <PeriodFilter
              value={leadsTrendPeriod}
              onChange={setLeadsTrendPeriod}
            />
          }
          className="min-w-0 lg:col-span-2 2xl:col-span-6"
          contentClassName="min-w-0 pt-1 sm:pt-2"
        >
          <MultiLineChart series={leadsTrendSeries} />
        </DashboardCard>

        <DashboardCard
          title={data.leadsFunnel.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
          contentClassName="flex min-h-0 flex-col justify-center"
        >
          <FunnelChart stages={data.leadsFunnel.stages} />
        </DashboardCard>

        <DashboardCard
          title={data.leadSources.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
        >
          <DonutChart
            segments={leadSourceSegments}
            centerValue={leadSourceTotal.toLocaleString('en-BD')}
            centerLabel="Total Leads"
            height={180}
            legendPosition="responsive"
            legendVariant="value-percent"
          />
        </DashboardCard>
      </div>
      </DashboardWidget>

      <DashboardWidget widget="marketing">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-12">
        <DashboardCard
          title={data.campaigns.title}
          action={
            <CardLinkAction href="/dashboard/campaigns" label="View All Campaigns" />
          }
          className="min-w-0 lg:col-span-2 2xl:col-span-6"
          contentClassName="pt-0"
          footer={campaignsViewMore.footer}
        >
          <div className={TABLE_SCROLL_CLASS}>
            <CampaignPerformanceTable rows={campaignsViewMore.visibleItems} />
          </div>
        </DashboardCard>

        <DashboardCard
          title={data.channelPerformance.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
          contentClassName="min-w-0"
        >
          <ComboBarLineChart data={data.channelPerformance.data} />
        </DashboardCard>

        <DashboardCard
          title={data.budget.title}
          action={
            <PeriodFilter
              value={budgetPeriod}
              onChange={setBudgetPeriod}
              options={['week', 'month', 'year']}
            />
          }
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
          contentClassName="flex min-h-0 flex-col justify-center"
        >
          <BudgetOverviewChart summary={budgetSummary} />
        </DashboardCard>
      </div>
      </DashboardWidget>

      <DashboardWidget widget="leads">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-12">
        <DashboardCard
          title={data.leadQuality.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
        >
          <LeadQualityList rows={data.leadQuality.rows} />
        </DashboardCard>

        <DashboardCard
          title={data.monthlyOverview.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
          contentClassName="min-w-0"
        >
          <MonthlyLeadsChart data={data.monthlyOverview.data} />
        </DashboardCard>

        <DashboardCard
          title={data.activities.title}
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
          footer={activitiesViewMore.footer}
        >
          <AlertFeed items={activitiesViewMore.visibleItems} />
        </DashboardCard>

        <DashboardCard
          title={data.insights.title}
          action={
            <CardLinkAction href="/dashboard/insights" label="View Detailed Insights" />
          }
          className="min-w-0 lg:col-span-1 2xl:col-span-3"
          footer={insightsViewMore.footer}
        >
          <InsightList items={insightsViewMore.visibleItems} />
        </DashboardCard>
      </div>
      </DashboardWidget>
    </div>
  );
}
