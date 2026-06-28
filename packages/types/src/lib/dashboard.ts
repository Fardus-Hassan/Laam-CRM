import { z } from 'zod';
import { userRoleSchema } from './roles.js';

/** Shared primitives — reused across role dashboards and API responses. */

export const trendDirectionSchema = z.enum(['up', 'down', 'neutral']);
export type TrendDirection = z.infer<typeof trendDirectionSchema>;

export const chartPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});
export type ChartPoint = z.infer<typeof chartPointSchema>;

export const kpiMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  changePercent: z.number().optional(),
  trend: trendDirectionSchema.optional(),
  comparisonLabel: z.string().optional(),
  icon: z.string().optional(),
  sparkline: z.array(chartPointSchema).optional(),
  requiredPermission: z.string().optional(),
});
export type KpiMetric = z.infer<typeof kpiMetricSchema>;

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

export const orderStatusTypeSchema = z.enum([
  'confirmed',
  'delivered',
  'cancelled',
  'hold',
  'follow_up',
  'pending',
  'in_progress',
]);
export type OrderStatusType = z.infer<typeof orderStatusTypeSchema>;

export const agentOrderRowSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  customerName: z.string(),
  status: orderStatusTypeSchema,
  amount: z.number(),
  date: z.string(),
});
export type AgentOrderRow = z.infer<typeof agentOrderRowSchema>;

export const agentScoreBoardSchema = z.object({
  totalScore: z.number(),
  rating: z.string(),
  rank: z.number().int().positive(),
  monthChange: z.number(),
  progressCurrent: z.number(),
  progressTarget: z.number(),
  rankChange: z.number().optional(),
});
export type AgentScoreBoard = z.infer<typeof agentScoreBoardSchema>;

export const agentPresenceSchema = z.enum(['online', 'away', 'offline']);
export type AgentPresence = z.infer<typeof agentPresenceSchema>;

export const teamAgentPerformanceRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  assigned: z.number(),
  confirmed: z.number(),
  delivered: z.number(),
  cancelled: z.number(),
  held: z.number(),
  followUps: z.number(),
  score: z.number(),
  incentive: z.number(),
  presence: agentPresenceSchema,
});
export type TeamAgentPerformanceRow = z.infer<typeof teamAgentPerformanceRowSchema>;

export const agentActivityItemSchema = z.object({
  id: z.string(),
  agentName: z.string(),
  avatarUrl: z.string().optional(),
  message: z.string(),
  timestamp: z.string(),
  type: z.enum(['success', 'info', 'warning', 'default']).optional(),
});
export type AgentActivityItem = z.infer<typeof agentActivityItemSchema>;

export const teamSubTargetSchema = z.object({
  id: z.string(),
  label: z.string(),
  target: z.number(),
  achieved: z.number(),
  achievementPercent: z.number(),
});
export type TeamSubTarget = z.infer<typeof teamSubTargetSchema>;

export const incentiveLineItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  amount: z.number(),
});
export type IncentiveLineItem = z.infer<typeof incentiveLineItemSchema>;

export const agentIncentiveSummarySchema = z.object({
  totalEarned: z.number(),
  periodLabel: z.string(),
  breakdown: z.array(incentiveLineItemSchema),
  nextPayoutDate: z.string(),
});
export type AgentIncentiveSummary = z.infer<typeof agentIncentiveSummarySchema>;

export const followUpRowSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  phone: z.string(),
  lastFollowUp: z.string(),
  nextFollowUp: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
});
export type FollowUpRow = z.infer<typeof followUpRowSchema>;

export const incentiveHistoryRowSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  type: z.string(),
  amount: z.number(),
});
export type IncentiveHistoryRow = z.infer<typeof incentiveHistoryRowSchema>;

export const leaderboardRowSchema = agentRankRowSchema.extend({
  isCurrentUser: z.boolean().optional(),
  trophy: z.enum(['gold', 'silver', 'bronze']).optional(),
});
export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>;

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
    totalSales: z.number(),
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

/** Agent / Sales Rep dashboard — full API payload shape. */
export const agentDashboardSchema = z.object({
  role: userRoleSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
  }),
  kpis: z.array(kpiMetricSchema),
  myOrders: z.object({
    title: z.string(),
    rows: z.array(agentOrderRowSchema),
  }),
  scoreBoard: z.object({
    title: z.string(),
    data: agentScoreBoardSchema,
  }),
  incentive: z.object({
    title: z.string(),
    data: agentIncentiveSummarySchema,
  }),
  orderStatus: z.object({
    title: z.string(),
    totalOrders: z.number(),
    segments: z.array(donutSegmentSchema),
  }),
  ordersTrend: z.object({
    title: z.string(),
    periodLabel: z.string(),
    data: z.array(chartPointSchema),
  }),
  leaderboard: z.object({
    title: z.string(),
    rows: z.array(leaderboardRowSchema),
  }),
  followUps: z.object({
    title: z.string(),
    rows: z.array(followUpRowSchema),
  }),
  incentiveHistory: z.object({
    title: z.string(),
    rows: z.array(incentiveHistoryRowSchema),
  }),
  notifications: z.object({
    title: z.string(),
    items: z.array(alertItemSchema),
  }),
});
export type AgentDashboard = z.infer<typeof agentDashboardSchema>;

export const funnelStageSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  percent: z.number(),
});
export type FunnelStage = z.infer<typeof funnelStageSchema>;

export const campaignPerformanceRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  channel: z.string(),
  leads: z.number(),
  qualifiedLeads: z.number(),
  convertedLeads: z.number(),
  conversionRate: z.number(),
  cost: z.number(),
  costPerLead: z.number(),
  roi: z.number(),
});
export type CampaignPerformanceRow = z.infer<typeof campaignPerformanceRowSchema>;

export const channelPerformancePointSchema = z.object({
  label: z.string(),
  leads: z.number(),
  conversionRate: z.number(),
});
export type ChannelPerformancePoint = z.infer<typeof channelPerformancePointSchema>;

export const leadQualityRowSchema = z.object({
  id: z.string(),
  source: z.string(),
  high: z.number(),
  medium: z.number(),
  low: z.number(),
});
export type LeadQualityRow = z.infer<typeof leadQualityRowSchema>;

export const monthlyLeadsPointSchema = z.object({
  label: z.string(),
  leads: z.number(),
  converted: z.number(),
  conversionRate: z.number(),
});
export type MonthlyLeadsPoint = z.infer<typeof monthlyLeadsPointSchema>;

export const insightItemSchema = z.object({
  id: z.string(),
  type: z.enum(['success', 'info', 'warning', 'trend']),
  message: z.string(),
});
export type InsightItem = z.infer<typeof insightItemSchema>;

export const dualAxisPointSchema = z.object({
  label: z.string(),
  bar: z.number(),
  line: z.number(),
});
export type DualAxisPoint = z.infer<typeof dualAxisPointSchema>;

export const performanceHighlightSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  icon: z.string().optional(),
});
export type PerformanceHighlight = z.infer<typeof performanceHighlightSchema>;

export const ceoDepartmentRowSchema = z.object({
  id: z.string(),
  department: z.string(),
  revenue: z.number(),
  target: z.number(),
  achievementPercent: z.number(),
  growthPercent: z.number(),
  trend: trendDirectionSchema,
});
export type CeoDepartmentRow = z.infer<typeof ceoDepartmentRowSchema>;

export const ceoTeamRowSchema = z.object({
  id: z.string(),
  team: z.string(),
  revenue: z.number(),
  orders: z.number(),
  achievementPercent: z.number(),
  rating: z.number().min(0).max(5),
});
export type CeoTeamRow = z.infer<typeof ceoTeamRowSchema>;

export const marketMetricRowSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  changeLabel: z.string().optional(),
  trend: trendDirectionSchema.optional(),
  icon: z.string().optional(),
});
export type MarketMetricRow = z.infer<typeof marketMetricRowSchema>;

export const goalBreakdownSchema = z.object({
  total: z.number(),
  achieved: z.number(),
  inProgress: z.number(),
  pending: z.number(),
});
export type GoalBreakdown = z.infer<typeof goalBreakdownSchema>;

export const sparklineMetricSchema = metricRowSchema.extend({
  sparkline: z.array(chartPointSchema).optional(),
});
export type SparklineMetric = z.infer<typeof sparklineMetricSchema>;

/** CEO / Executive dashboard — full API payload shape. */
export const ceoDashboardSchema = z.object({
  role: userRoleSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  welcomeMessage: z.string().optional(),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
  }),
  kpis: z.array(kpiMetricSchema),
  footerStats: z.array(kpiMetricSchema),
  revenueOverview: z.object({
    title: z.string(),
    barLabel: z.string(),
    lineLabel: z.string(),
    data: z.array(dualAxisPointSchema),
  }),
  businessPerformance: z.object({
    title: z.string(),
    performancePercent: z.number(),
    performanceLabel: z.string(),
    metrics: z.array(metricRowSchema),
    achievementPercent: z.number(),
    highlights: z.array(performanceHighlightSchema),
  }),
  revenueByUnit: z.object({
    title: z.string(),
    totalLabel: z.string(),
    segments: z.array(donutSegmentSchema),
  }),
  departmentPerformance: z.object({
    title: z.string(),
    rows: z.array(ceoDepartmentRowSchema),
  }),
  salesTrend: z.object({
    title: z.string(),
    barLabel: z.string(),
    lineLabel: z.string(),
    data: z.array(dualAxisPointSchema),
  }),
  topTeams: z.object({
    title: z.string(),
    rows: z.array(ceoTeamRowSchema),
  }),
  marketOverview: z.object({
    title: z.string(),
    items: z.array(marketMetricRowSchema),
  }),
  executiveKpis: z.object({
    title: z.string(),
    items: z.array(sparklineMetricSchema),
  }),
  goalAchievement: z.object({
    title: z.string(),
    overallPercent: z.number(),
    breakdown: goalBreakdownSchema,
  }),
  financialOverview: z.object({
    title: z.string(),
    items: z.array(metricRowSchema),
  }),
  alerts: z.object({
    title: z.string(),
    items: z.array(alertItemSchema),
  }),
});
export type CeoDashboard = z.infer<typeof ceoDashboardSchema>;

/** Team Leader dashboard — full API payload shape. */
export const teamLeaderDashboardSchema = z.object({
  role: userRoleSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  teamName: z.string().optional(),
  teamSize: z.number().optional(),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
  }),
  kpis: z.array(kpiMetricSchema),
  teamPerformance: z.object({
    title: z.string(),
    periodLabel: z.string(),
    series: z.array(chartSeriesSchema),
  }),
  scoreBoard: z.object({
    title: z.string(),
    data: agentScoreBoardSchema,
  }),
  incentive: z.object({
    title: z.string(),
    data: agentIncentiveSummarySchema,
  }),
  agentPerformance: z.object({
    title: z.string(),
    rows: z.array(teamAgentPerformanceRowSchema),
  }),
  activities: z.object({
    title: z.string(),
    items: z.array(agentActivityItemSchema),
  }),
  orderStatus: z.object({
    title: z.string(),
    totalOrders: z.number(),
    segments: z.array(donutSegmentSchema),
  }),
  followUpOverview: z.object({
    title: z.string(),
    totalFollowUps: z.number(),
    segments: z.array(donutSegmentSchema),
  }),
  teamTargets: z.object({
    title: z.string(),
    overall: targetSummarySchema,
    subTargets: z.array(teamSubTargetSchema),
  }),
  notifications: z.object({
    title: z.string(),
    items: z.array(alertItemSchema),
  }),
});
export type TeamLeaderDashboard = z.infer<typeof teamLeaderDashboardSchema>;

export const userAccountStatusSchema = z.enum(['active', 'inactive']);
export type UserAccountStatus = z.infer<typeof userAccountStatusSchema>;

export const systemHealthStatusSchema = z.enum([
  'operational',
  'degraded',
  'down',
]);
export type SystemHealthStatus = z.infer<typeof systemHealthStatusSchema>;

export const superAdminUserRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  organization: z.string(),
  status: userAccountStatusSchema,
  joinedAt: z.string().optional(),
});
export type SuperAdminUserRow = z.infer<typeof superAdminUserRowSchema>;

export const systemHealthItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: systemHealthStatusSchema,
  statusLabel: z.string().optional(),
});
export type SystemHealthItem = z.infer<typeof systemHealthItemSchema>;

export const storageUsageSchema = z.object({
  usedPercent: z.number(),
  usedGb: z.number(),
  totalGb: z.number(),
  availableGb: z.number(),
});
export type StorageUsage = z.infer<typeof storageUsageSchema>;

/** Super Admin dashboard — full API payload shape. */
export const superAdminDashboardSchema = z.object({
  role: userRoleSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  welcomeMessage: z.string().optional(),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
  }),
  kpis: z.array(kpiMetricSchema),
  salesOverview: z.object({
    title: z.string(),
    revenueLabel: z.string(),
    ordersLabel: z.string(),
    data: z.array(dualAxisPointSchema),
  }),
  ordersStatus: z.object({
    title: z.string(),
    totalOrders: z.number(),
    segments: z.array(donutSegmentSchema),
  }),
  roleDistribution: z.object({
    title: z.string(),
    totalLabel: z.string(),
    segments: z.array(donutSegmentSchema),
  }),
  monthlyRevenue: z.object({
    title: z.string(),
    data: z.array(chartPointSchema),
  }),
  recentUsers: z.object({
    title: z.string(),
    rows: z.array(superAdminUserRowSchema),
  }),
  systemHealth: z.object({
    title: z.string(),
    items: z.array(systemHealthItemSchema),
  }),
  topAgents: z.object({
    title: z.string(),
    rows: z.array(agentRankRowSchema),
  }),
  recentActivities: z.object({
    title: z.string(),
    items: z.array(agentActivityItemSchema),
  }),
  leadSources: z.object({
    title: z.string(),
    totalLeads: z.number(),
    segments: z.array(donutSegmentSchema),
  }),
  storageUsage: z.object({
    title: z.string(),
    usage: storageUsageSchema,
  }),
});
export type SuperAdminDashboard = z.infer<typeof superAdminDashboardSchema>;

/** Marketing Head dashboard — full API payload shape. */
export const marketingHeadDashboardSchema = z.object({
  role: userRoleSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  welcomeMessage: z.string().optional(),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
  }),
  kpis: z.array(kpiMetricSchema),
  leadsTrend: z.object({
    title: z.string(),
    periodLabel: z.string(),
    series: z.array(chartSeriesSchema),
  }),
  leadsFunnel: z.object({
    title: z.string(),
    stages: z.array(funnelStageSchema),
  }),
  leadSources: z.object({
    title: z.string(),
    segments: z.array(donutSegmentSchema),
  }),
  campaigns: z.object({
    title: z.string(),
    rows: z.array(campaignPerformanceRowSchema),
  }),
  channelPerformance: z.object({
    title: z.string(),
    data: z.array(channelPerformancePointSchema),
  }),
  budget: z.object({
    title: z.string(),
    periodLabel: z.string(),
    summary: targetSummarySchema,
  }),
  leadQuality: z.object({
    title: z.string(),
    rows: z.array(leadQualityRowSchema),
  }),
  monthlyOverview: z.object({
    title: z.string(),
    data: z.array(monthlyLeadsPointSchema),
  }),
  activities: z.object({
    title: z.string(),
    items: z.array(alertItemSchema),
  }),
  insights: z.object({
    title: z.string(),
    items: z.array(insightItemSchema),
  }),
});
export type MarketingHeadDashboard = z.infer<typeof marketingHeadDashboardSchema>;

/** Generic dashboard envelope — extend with more role payloads later. */
export const dashboardResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('sales_head'),
    data: salesHeadDashboardSchema,
  }),
  z.object({
    kind: z.literal('agent'),
    data: agentDashboardSchema,
  }),
  z.object({
    kind: z.literal('marketing_head'),
    data: marketingHeadDashboardSchema,
  }),
  z.object({
    kind: z.literal('ceo'),
    data: ceoDashboardSchema,
  }),
  z.object({
    kind: z.literal('team_leader'),
    data: teamLeaderDashboardSchema,
  }),
  z.object({
    kind: z.literal('super_admin'),
    data: superAdminDashboardSchema,
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
