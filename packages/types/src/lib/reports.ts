import { z } from 'zod';
import { chartPointSchema, dualAxisPointSchema } from './dashboard.js';

export const reportPeriodSchema = z.enum(['7d', '30d', '90d', 'ytd', 'custom']);
export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

export const reportViewIdSchema = z.enum([
  'summary',
  'sales',
  'revenue',
  'repeat-customers',
  'product-sales',
  'product-daily',
  'top-sold',
  'top-return',
  'top-purchased',
  'low-stock',
  'high-stock',
  'agents',
  'teams',
  'orders-by-employee',
  'employee-activity',
  'team-targets',
  'marketing',
  'campaign',
  'sources',
  'upsales',
  'login-history',
  'platform',
]);

export type ReportViewId = z.infer<typeof reportViewIdSchema>;

export const reportKpiSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  change: z.number().optional(),
  hint: z.string().optional(),
});

export type ReportKpi = z.infer<typeof reportKpiSchema>;

export const reportSummarySchema = z.object({
  period: reportPeriodSchema,
  kpis: z.array(reportKpiSchema),
  revenueTrend: z.array(chartPointSchema),
  ordersTrend: z.array(chartPointSchema),
  topProducts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    units: z.number(),
    revenueBdt: z.number(),
  })),
  recentHighlights: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
  })),
});

export type ReportSummary = z.infer<typeof reportSummarySchema>;

export const rankedProductRowSchema = z.object({
  rank: z.number(),
  id: z.string(),
  name: z.string(),
  sku: z.string().optional(),
  value: z.number(),
  secondaryValue: z.number().optional(),
  unit: z.string().optional(),
});

export type RankedProductRow = z.infer<typeof rankedProductRowSchema>;

export const employeeMetricRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  orders: z.number(),
  revenueBdt: z.number(),
  conversionRate: z.number().optional(),
  avgOrderValue: z.number().optional(),
  activities: z.number().optional(),
});

export type EmployeeMetricRow = z.infer<typeof employeeMetricRowSchema>;

export const repeatCustomerRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  mobile: z.string(),
  orderCount: z.number(),
  totalSpentBdt: z.number(),
  lastOrderDate: z.string(),
  avgDaysBetween: z.number().optional(),
});

export type RepeatCustomerRow = z.infer<typeof repeatCustomerRowSchema>;

export const loginHistoryRowSchema = z.object({
  id: z.string(),
  userName: z.string(),
  email: z.string(),
  ip: z.string(),
  device: z.string(),
  loggedInAt: z.string(),
  status: z.enum(['success', 'failed']),
});

export type LoginHistoryRow = z.infer<typeof loginHistoryRowSchema>;

export const marketingReportSchema = z.object({
  spendBdt: z.number(),
  revenueBdt: z.number(),
  roas: z.number(),
  leads: z.number(),
  orders: z.number(),
  trend: z.array(dualAxisPointSchema),
  campaigns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    spendBdt: z.number(),
    revenueBdt: z.number(),
    roas: z.number(),
    orders: z.number(),
  })),
});

export type MarketingReport = z.infer<typeof marketingReportSchema>;

export const leadSourceRowSchema = z.object({
  source: z.string(),
  leads: z.number(),
  orders: z.number(),
  conversionRate: z.number(),
  revenueBdt: z.number(),
});

export type LeadSourceRow = z.infer<typeof leadSourceRowSchema>;

export const teamTargetRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetOrders: z.number(),
  actualOrders: z.number(),
  targetRevenueBdt: z.number(),
  actualRevenueBdt: z.number(),
  progressPercent: z.number(),
});

export type TeamTargetRow = z.infer<typeof teamTargetRowSchema>;

export const upsellRowSchema = z.object({
  id: z.string(),
  baseProduct: z.string(),
  upsellProduct: z.string(),
  count: z.number(),
  revenueBdt: z.number(),
  rate: z.number(),
});

export type UpsellRow = z.infer<typeof upsellRowSchema>;

export const marketingSpendRowSchema = z.object({
  id: z.string(),
  monthKey: z.string(),
  campaignName: z.string(),
  spendBdt: z.number(),
  notes: z.string().optional(),
});

export type MarketingSpendRow = z.infer<typeof marketingSpendRowSchema>;

export const upsertMarketingSpendPayloadSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  campaignName: z.string().min(1),
  spendBdt: z.number().nonnegative(),
  notes: z.string().optional(),
});

export type UpsertMarketingSpendPayload = z.infer<typeof upsertMarketingSpendPayloadSchema>;

export const upsertPerformanceTargetPayloadSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  scope: z.enum(['agent', 'team']),
  subjectKey: z.string().min(1),
  subjectLabel: z.string().min(1),
  targetOrders: z.number().int().nonnegative(),
  targetRevenueBdt: z.number().nonnegative(),
});

export type UpsertPerformanceTargetPayload = z.infer<
  typeof upsertPerformanceTargetPayloadSchema
>;

export const reportQuerySchema = z.object({
  view: reportViewIdSchema.optional(),
  period: reportPeriodSchema.optional(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
