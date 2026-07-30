import { z } from 'zod';

/** How agent KPI is measured for a plan. */
export const incentiveMetricTypeSchema = z.enum([
  'order_count',
  'cross_sell_count',
  'return_ratio',
  'recovery_count',
  'manual',
]);
export type IncentiveMetricType = z.infer<typeof incentiveMetricTypeSchema>;

export const incentiveMetricDirectionSchema = z.enum(['higher', 'lower']);
export type IncentiveMetricDirection = z.infer<typeof incentiveMetricDirectionSchema>;

export const incentiveMetricConfigSchema = z.object({
  includeStatuses: z.array(z.string()).optional(),
  excludeStatuses: z.array(z.string()).optional(),
  /** For cross_sell_count — default 2. */
  minItems: z.number().int().positive().optional(),
  /** Optional: also count orders whose orderTag matches (OR with minItems). */
  orderTags: z.array(z.string()).optional(),
  direction: incentiveMetricDirectionSchema.optional(),
  deliveredStatuses: z.array(z.string()).optional(),
  returnedStatuses: z.array(z.string()).optional(),
});
export type IncentiveMetricConfig = z.infer<typeof incentiveMetricConfigSchema>;

export const incentiveSlabSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  dailyTarget: z.number().nullable().optional(),
  monthlyTarget: z.number(),
  incentiveBdt: z.number(),
  sortOrder: z.number(),
});
export type IncentiveSlab = z.infer<typeof incentiveSlabSchema>;

export const incentiveTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  planCount: z.number().optional(),
});
export type IncentiveTeam = z.infer<typeof incentiveTeamSchema>;

export const incentivePlanSchema = z.object({
  id: z.string(),
  teamId: z.string().nullable().optional(),
  teamName: z.string().optional(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  metricType: incentiveMetricTypeSchema,
  metricConfig: incentiveMetricConfigSchema.optional(),
  /** Optional team-wide monthly target (informational / rollup). */
  teamMonthlyTarget: z.number().nullable().optional(),
  periodType: z.literal('monthly'),
  isActive: z.boolean(),
  prorataAboveTop: z.boolean(),
  sortOrder: z.number(),
  slabs: z.array(incentiveSlabSchema),
  assignmentCount: z.number().optional(),
});
export type IncentivePlan = z.infer<typeof incentivePlanSchema>;

export const incentiveAssignmentSchema = z.object({
  id: z.string(),
  planId: z.string(),
  planName: z.string().optional(),
  teamName: z.string().optional(),
  agentName: z.string(),
  userId: z.string().nullable().optional(),
  /** morning | evening | night — optional duty shift */
  shift: z.string().nullable().optional(),
  startsOn: z.string(),
  endsOn: z.string().nullable().optional(),
  isActive: z.boolean(),
});
export type IncentiveAssignment = z.infer<typeof incentiveAssignmentSchema>;

export const incentiveSalaryTemplateSchema = z.object({
  basicBdt: z.number(),
  houseRentBdt: z.number(),
  medicalBdt: z.number(),
  conveyanceBdt: z.number(),
  grossBdt: z.number(),
  attendanceBonusBdt: z.number(),
  lunchBdt: z.number(),
  totalBdt: z.number(),
  notes: z.string().optional(),
});
export type IncentiveSalaryTemplate = z.infer<typeof incentiveSalaryTemplateSchema>;

export const incentiveShiftTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  reportingTime: z.string().optional(),
  notes: z.string().optional(),
});
export type IncentiveShiftTemplate = z.infer<typeof incentiveShiftTemplateSchema>;

export const incentiveOverviewSchema = z.object({
  teams: z.array(incentiveTeamSchema),
  plans: z.array(incentivePlanSchema),
  assignments: z.array(incentiveAssignmentSchema),
  salaryTemplate: incentiveSalaryTemplateSchema.nullable().optional(),
  shiftTemplates: z.array(incentiveShiftTemplateSchema).optional(),
  teamCount: z.number(),
  planCount: z.number(),
  assignmentCount: z.number(),
});
export type IncentiveOverview = z.infer<typeof incentiveOverviewSchema>;

export const incentiveWarningSchema = z.enum([
  'none',
  'below_target',
  'above_return_cap',
  'manual_missing',
  'final_warning',
]);
export type IncentiveWarning = z.infer<typeof incentiveWarningSchema>;

export const incentivePerformanceLineSchema = z.object({
  assignmentId: z.string(),
  agentName: z.string(),
  planId: z.string(),
  planName: z.string(),
  teamName: z.string().optional(),
  metricType: incentiveMetricTypeSchema,
  actualValue: z.number(),
  matchedSlabId: z.string().nullable().optional(),
  matchedSlabLabel: z.string().nullable().optional(),
  monthlyTarget: z.number().nullable().optional(),
  /** Lowest slab target for higher-is-better (entry threshold). */
  entryTarget: z.number().nullable().optional(),
  incentiveBdt: z.number(),
  prorataApplied: z.boolean().optional(),
  manualOverride: z.boolean().optional(),
  consecutiveMissMonths: z.number().optional(),
  warning: incentiveWarningSchema.optional(),
  notes: z.string().optional(),
});
export type IncentivePerformanceLine = z.infer<typeof incentivePerformanceLineSchema>;

export const incentivePerformanceReportSchema = z.object({
  yearMonth: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  lines: z.array(incentivePerformanceLineSchema),
  totalIncentiveBdt: z.number(),
  warningCount: z.number().optional(),
  /** Sum of agent actuals rolled by plan (for team targets). */
  teamRollups: z
    .array(
      z.object({
        planId: z.string(),
        planName: z.string(),
        teamName: z.string().optional(),
        teamMonthlyTarget: z.number().nullable().optional(),
        actualTotal: z.number(),
        met: z.boolean().optional(),
      }),
    )
    .optional(),
  periodStatus: z.enum(['live', 'draft', 'approved', 'paid']).optional(),
});
export type IncentivePerformanceReport = z.infer<typeof incentivePerformanceReportSchema>;

export const incentivePeriodStatusSchema = z.enum(['draft', 'approved', 'paid']);
export type IncentivePeriodStatus = z.infer<typeof incentivePeriodStatusSchema>;

export const incentivePayoutLineSchema = z.object({
  id: z.string(),
  assignmentId: z.string().nullable().optional(),
  agentName: z.string(),
  planId: z.string(),
  planName: z.string(),
  teamName: z.string().optional(),
  metricType: incentiveMetricTypeSchema,
  actualValue: z.number(),
  incentiveBdt: z.number(),
  matchedSlabLabel: z.string().nullable().optional(),
  warning: incentiveWarningSchema.optional(),
  notes: z.string().optional(),
});
export type IncentivePayoutLine = z.infer<typeof incentivePayoutLineSchema>;

export const incentivePeriodRunSchema = z.object({
  id: z.string(),
  yearMonth: z.string(),
  status: incentivePeriodStatusSchema,
  totalIncentiveBdt: z.number(),
  calculatedAt: z.string(),
  approvedAt: z.string().nullable().optional(),
  approvedByName: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  paidByName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(incentivePayoutLineSchema),
});
export type IncentivePeriodRun = z.infer<typeof incentivePeriodRunSchema>;

export const incentiveSlabInputSchema = z.object({
  label: z.string().optional().nullable(),
  dailyTarget: z.number().optional().nullable(),
  monthlyTarget: z.number(),
  incentiveBdt: z.number(),
  sortOrder: z.number().optional(),
});
export type IncentiveSlabInput = z.infer<typeof incentiveSlabInputSchema>;

export const createIncentiveTeamPayloadSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type CreateIncentiveTeamPayload = z.infer<typeof createIncentiveTeamPayloadSchema>;

export const updateIncentiveTeamPayloadSchema = createIncentiveTeamPayloadSchema.partial();
export type UpdateIncentiveTeamPayload = z.infer<typeof updateIncentiveTeamPayloadSchema>;

export const createIncentivePlanPayloadSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  teamId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  metricType: incentiveMetricTypeSchema,
  metricConfig: incentiveMetricConfigSchema.optional().nullable(),
  teamMonthlyTarget: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
  prorataAboveTop: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  slabs: z.array(incentiveSlabInputSchema).optional(),
});
export type CreateIncentivePlanPayload = z.infer<typeof createIncentivePlanPayloadSchema>;

export const updateIncentivePlanPayloadSchema = createIncentivePlanPayloadSchema.partial();
export type UpdateIncentivePlanPayload = z.infer<typeof updateIncentivePlanPayloadSchema>;

export const createIncentiveAssignmentPayloadSchema = z.object({
  planId: z.string().min(1),
  agentName: z.string().min(1),
  userId: z.string().optional().nullable(),
  shift: z.string().optional().nullable(),
  startsOn: z.string().optional(),
  endsOn: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type CreateIncentiveAssignmentPayload = z.infer<
  typeof createIncentiveAssignmentPayloadSchema
>;

export const updateIncentiveAssignmentPayloadSchema =
  createIncentiveAssignmentPayloadSchema.partial();
export type UpdateIncentiveAssignmentPayload = z.infer<
  typeof updateIncentiveAssignmentPayloadSchema
>;

export const upsertIncentiveSalaryPayloadSchema = incentiveSalaryTemplateSchema;
export type UpsertIncentiveSalaryPayload = z.infer<typeof upsertIncentiveSalaryPayloadSchema>;

export const upsertIncentiveShiftsPayloadSchema = z.object({
  shifts: z.array(incentiveShiftTemplateSchema),
});
export type UpsertIncentiveShiftsPayload = z.infer<typeof upsertIncentiveShiftsPayloadSchema>;

export const upsertIncentiveManualActualPayloadSchema = z.object({
  assignmentId: z.string().min(1),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  actualValue: z.number(),
  note: z.string().optional().nullable(),
});
export type UpsertIncentiveManualActualPayload = z.infer<
  typeof upsertIncentiveManualActualPayloadSchema
>;
