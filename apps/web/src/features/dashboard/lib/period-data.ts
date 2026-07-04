import type { ChartPoint, ChartSeries, DonutSegment } from '@laam/types';

import type { DashboardPeriod } from '@/features/dashboard/types/period';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const PERIOD_FACTORS: Record<DashboardPeriod, number> = {
  week: 1,
  month: 4.2,
  year: 48,
};

function scaleValue(value: number, factor: number): number {
  return Math.round(value * factor);
}

export function scaleMetricValue(
  value: number,
  period: DashboardPeriod,
): number {
  return scaleValue(value, PERIOD_FACTORS[period]);
}

function bucketWeeklyToMonthly(points: ChartPoint[]): ChartPoint[] {
  const chunkSize = Math.max(1, Math.ceil(points.length / 4));

  return Array.from({ length: 4 }, (_, index) => {
    const chunk = points.slice(index * chunkSize, (index + 1) * chunkSize);
    const total = chunk.reduce((sum, point) => sum + point.value, 0);

    return {
      label: `W${index + 1}`,
      value: total,
    };
  });
}

function bucketToYearly(points: ChartPoint[]): ChartPoint[] {
  const base =
    points.reduce((sum, point) => sum + point.value, 0) / points.length;

  return MONTH_LABELS.map((label, index) => ({
    label,
    value: scaleValue(base * (0.75 + (index % 6) * 0.08), 1 + index * 0.15),
  }));
}

export function transformChartPoints(
  points: ChartPoint[],
  period: DashboardPeriod,
): ChartPoint[] {
  if (period === 'week') {
    return points;
  }

  if (period === 'month') {
    return bucketWeeklyToMonthly(points);
  }

  return bucketToYearly(points);
}

export function transformChartSeries(
  series: ChartSeries[],
  period: DashboardPeriod,
): ChartSeries[] {
  return series.map((item) => ({
    ...item,
    data: transformChartPoints(item.data, period),
  }));
}

export function transformMonthlyRevenue(
  points: ChartPoint[],
  period: DashboardPeriod,
): ChartPoint[] {
  if (period === 'month') {
    return points;
  }

  if (period === 'week') {
    return points.slice(-4).map((point, index) => ({
      label: `D${index + 1}`,
      value: scaleValue(point.value, 0.35),
    }));
  }

  return bucketToYearly(points);
}

export function transformDonutSegments(
  segments: DonutSegment[],
  period: DashboardPeriod,
): DonutSegment[] {
  const scaled = segments.map((segment) => ({
    ...segment,
    value: scaleMetricValue(segment.value, period),
  }));

  const total = scaled.reduce((sum, segment) => sum + segment.value, 0);

  return scaled.map((segment) => ({
    ...segment,
    percent: total
      ? Number(((segment.value / total) * 100).toFixed(1))
      : segment.percent,
  }));
}

export function transformTeamRows<
  T extends {
    totalOrders: number;
    confirmed: number;
    delivered: number;
    cancelled: number;
    revenue: number;
  },
>(rows: T[], period: DashboardPeriod): T[] {
  if (period === 'week') {
    return rows;
  }

  return rows.map((row) => ({
    ...row,
    totalOrders: scaleMetricValue(row.totalOrders, period),
    confirmed: scaleMetricValue(row.confirmed, period),
    delivered: scaleMetricValue(row.delivered, period),
    cancelled: scaleMetricValue(row.cancelled, period),
    revenue: scaleMetricValue(row.revenue, period),
  }));
}

export function transformAgentRows<
  T extends { orders: number; revenue: number },
>(rows: T[], period: DashboardPeriod): T[] {
  if (period === 'week') {
    return rows;
  }

  return rows.map((row) => ({
    ...row,
    orders: scaleMetricValue(row.orders, period),
    revenue: scaleMetricValue(row.revenue, period),
  }));
}
