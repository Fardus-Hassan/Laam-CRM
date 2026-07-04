export type DashboardPeriod = 'week' | 'month' | 'year';

export const DASHBOARD_PERIODS = ['week', 'month', 'year'] as const;

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  week: 'Week',
  month: 'Month',
  year: 'Year',
};

export const PERIOD_COMPARISON_LABELS: Record<DashboardPeriod, string> = {
  week: 'vs last week',
  month: 'vs last month',
  year: 'vs last year',
};
