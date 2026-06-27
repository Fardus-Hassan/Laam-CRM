import { z } from 'zod';
import { userRoleSchema } from './roles.js';

/** Shared primitives — reused across role dashboards and API responses. */

export const trendDirectionSchema = z.enum(['up', 'down', 'neutral']);
export type TrendDirection = z.infer<typeof trendDirectionSchema>;

export const kpiMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  changePercent: z.number().optional(),
  trend: trendDirectionSchema.optional(),
  comparisonLabel: z.string().optional(),
  icon: z.string().optional(),
});
export type KpiMetric = z.infer<typeof kpiMetricSchema>;

export const chartPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});
export type ChartPoint = z.infer<typeof chartPointSchema>;

export const chartSeriesSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string().optional(),
  data: z.array(chartPointSchema),
});
export type ChartSeries = z.infer<typeof chartSeriesSchema>;

export const donutSegmentSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  percent: z.number(),
  color: z.string().optional(),
});
export type DonutSegment = z.infer<typeof donutSegmentSchema>;

export const metricRowSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  changePercent: z.number().optional(),
  trend: trendDirectionSchema.optional(),
});
export type MetricRow = z.infer<typeof metricRowSchema>;

export const targetSummarySchema = z.object({
  target: z.number(),
  achieved: z.number(),
  remaining: z.number(),
  achievementPercent: z.number(),
});
export type TargetSummary = z.infer<typeof targetSummarySchema>;

export const teamPerformanceRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
  avatarUrl: z.string().optional(),
  totalOrders: z.number(),
  confirmed: z.number(),
  delivered: z.number(),
  cancelled: z.number(),
  revenue: z.number(),
  achievementPercent: z.number(),
});
export type TeamPerformanceRow = z.infer<typeof teamPerformanceRowSchema>;

export const agentRankRowSchema = z.object({
  id: z.string(),
  rank: z.number().int().positive(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  orders: z.number(),
  revenue: z.number(),
  score: z.number(),
});
export type AgentRankRow = z.infer<typeof agentRankRowSchema>;

export const departmentTargetRowSchema = z.object({
  id: z.string(),
  department: z.string(),
  monthlyTarget: z.number(),
  achieved: z.number(),
  achievementPercent: z.number(),
  status: z.enum(['on_track', 'excellent', 'at_risk', 'behind']),
});
export type DepartmentTargetRow = z.infer<typeof departmentTargetRowSchema>;

export const alertItemSchema = z.object({
  id: z.string(),
  type: z.enum(['warning', 'error', 'info', 'success']),
  message: z.string(),
  timestamp: z.string(),
});
export type AlertItem = z.infer<typeof alertItemSchema>;

/** Sales Head / Sales Manager dashboard — full API payload shape. */
export const salesHeadDashboardSchema = z.object({
  role: userRoleSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
  }),
  kpis: z.array(kpiMetricSchema),
  salesTrend: z.object({
    title: z.string(),
    periodLabel: z.string(),
    series: z.array(chartSeriesSchema),
  }),
  revenueTarget: z.object({
    title: z.string(),
    summary: targetSummarySchema,
    dailyAchievement: z.array(chartPointSchema),
    segments: z.array(donutSegmentSchema).optional(),
  }),
  overallPerformance: z.object({
    title: z.string(),
    metrics: z.array(metricRowSchema),
  }),
  teamPerformance: z.object({
    title: z.string(),
    rows: z.array(teamPerformanceRowSchema),
  }),
  topAgents: z.object({
    title: z.string(),
    rows: z.array(agentRankRowSchema),
  }),
  orderStatus: z.object({
    title: z.string(),
    segments: z.array(donutSegmentSchema),
  }),
  departmentTargets: z.object({
    title: z.string(),
    rows: z.array(departmentTargetRowSchema),
  }),
  monthlyRevenue: z.object({
    title: z.string(),
    data: z.array(chartPointSchema),
  }),
  alerts: z.object({
    title: z.string(),
    items: z.array(alertItemSchema),
  }),
});
export type SalesHeadDashboard = z.infer<typeof salesHeadDashboardSchema>;

/** Generic dashboard envelope — extend with more role payloads later. */
export const dashboardResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('sales_head'),
    data: salesHeadDashboardSchema,
  }),
  z.object({
    kind: z.literal('default'),
    data: z.object({
      role: userRoleSchema,
      title: z.string(),
      subtitle: z.string().optional(),
      kpis: z.array(kpiMetricSchema),
    }),
  }),
]);
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
