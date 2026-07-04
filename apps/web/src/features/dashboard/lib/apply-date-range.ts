import type { SalesHeadDashboard } from '@laam/types';

import { format } from 'date-fns';

import { formatDateRangeLabel, getRangeDayCount } from '@/lib/date-range';

const BASELINE_DAYS = 7;

function scaleNumber(value: number, factor: number): number {
  return Math.round(value * factor);
}

/**
 * Applies selected date range to mock dashboard data.
 * API integration: pass `from`/`to` query params; backend returns filtered payload.
 */
export function applyDateRangeToSalesHead(
  data: SalesHeadDashboard,
  from: Date,
  to: Date,
): SalesHeadDashboard {
  const days = getRangeDayCount(from, to);
  const factor = days / BASELINE_DAYS;

  return {
    ...data,
    dateRange: {
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
      label: formatDateRangeLabel({ from, to }),
    },
    kpis: data.kpis.map((kpi) => ({
      ...kpi,
      value:
        typeof kpi.value === 'number'
          ? scaleNumber(kpi.value, factor)
          : kpi.value,
      changePercent: kpi.changePercent
        ? Number((kpi.changePercent * Math.min(factor, 1.2)).toFixed(1))
        : kpi.changePercent,
    })),
    salesTrend: {
      ...data.salesTrend,
      periodLabel: `${days} day${days === 1 ? '' : 's'}`,
      series: data.salesTrend.series.map((series) => ({
        ...series,
        data: series.data.map((point, index) => ({
          ...point,
          value: scaleNumber(point.value, factor * (0.85 + (index % 3) * 0.05)),
        })),
      })),
    },
    revenueTarget: {
      ...data.revenueTarget,
      summary: {
        ...data.revenueTarget.summary,
        achieved: scaleNumber(data.revenueTarget.summary.achieved, factor),
        remaining: Math.max(
          0,
          data.revenueTarget.summary.target -
            scaleNumber(data.revenueTarget.summary.achieved, factor),
        ),
        achievementPercent: Number(
          Math.min(
            100,
            (scaleNumber(data.revenueTarget.summary.achieved, factor) /
              data.revenueTarget.summary.target) *
              100,
          ).toFixed(1),
        ),
      },
    },
    teamPerformance: {
      ...data.teamPerformance,
      rows: data.teamPerformance.rows.map((row) => ({
        ...row,
        totalOrders: scaleNumber(row.totalOrders, factor),
        confirmed: scaleNumber(row.confirmed, factor),
        delivered: scaleNumber(row.delivered, factor),
        cancelled: scaleNumber(row.cancelled, factor),
        revenue: scaleNumber(row.revenue, factor),
      })),
    },
    topAgents: {
      ...data.topAgents,
      rows: data.topAgents.rows.map((row) => ({
        ...row,
        orders: scaleNumber(row.orders, factor),
        revenue: scaleNumber(row.revenue, factor),
      })),
    },
    monthlyRevenue: {
      ...data.monthlyRevenue,
      data: data.monthlyRevenue.data.map((point) => ({
        ...point,
        value: scaleNumber(point.value, factor),
      })),
    },
  };
}
