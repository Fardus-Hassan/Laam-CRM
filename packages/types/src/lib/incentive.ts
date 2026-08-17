import { z } from 'zod';

/** How agent KPI is measured for a plan. */
export const incentiveMetricTypeSchema = z.enum([
  'order_count',
  'cross_sell_count',
  'return_ratio',
  'recovery_count',
  /** Relationship surveys — auto from survey logs. */
  'survey_count',
  /** Night-shift channel activity (call / FB / messenger / WA). */
  'channel_activity',
  /** Manual override entry. */
  'manual',
]);
export type IncentiveMetricType = z.infer<typeof incentiveMetricTypeSchema>;

export const incentiveMetricDirectionSchema = z.enum(['higher', 'lower']);
export type IncentiveMetricDirection = z.infer<typeof incentiveMetricDirectionSchema>;

export const incentiveChannelSchema = z.enum([
  'call',
  'facebook_comment',
  'messenger',
  'whatsapp',
]);
export type IncentiveChannel = z.infer<typeof incentiveChannelSchema>;

export const incentiveMetricConfigSchema = z.object({
  includeStatuses: z.array(z.string()).optional(),
  excludeStatuses: z.array(z.string()).optional(),
  minItems: z.number().int().positive().optional(),
  orderTags: z.array(z.string()).optional(),
  direction: incentiveMetricDirectionSchema.optional(),
  deliveredStatuses: z.array(z.string()).optional(),
  returnedStatuses: z.array(z.string()).optional(),
  /** Exclude agents/orders when personal return ratio exceeds this % (PDF high-return rule). */
  maxAgentReturnRatioPct: z.number().optional(),
  /** Daily entry target used for first warning (e.g. Telesales 8/day). */
  entryDailyTarget: z.number().optional(),
  /** Channels included for channel_activity metric. */
  channels: z.array(incentiveChannelSchema).optional(),
  /**
   * Incomplete statuses that qualify an order as “recovered” when it later
   * reaches includeStatuses (recovery_count). Defaults applied in calc.
   */
  recoveryFromStatuses: z.array(z.string()).optional(),
});
export type IncentiveMetricConfig = z.infer<typeof incentiveMetricConfigSchema>;

export const incentiveHrStatusSchema = z.enum([
  'active',
  'warning',
  'final_warning',
  'terminated',
]);
export type IncentiveHrStatus = z.infer<typeof incentiveHrStatusSchema>;

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
  /** Users-page team member count (leader + members). */
  memberCount: z.number().optional(),
  /** KPI plan attached to this Users team. */
  planId: z.string().nullable().optional(),
  hasStructure: z.boolean().optional(),
  metricTypes: z.array(incentiveMetricTypeSchema).optional(),
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
  shift: z.string().nullable().optional(),
  startsOn: z.string(),
  endsOn: z.string().nullable().optional(),
  isActive: z.boolean(),
  hrStatus: incentiveHrStatusSchema.optional(),
  consecutiveMissMonths: z.number().optional(),
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
  /** Default working days/month for full-attendance check (PDF). */
  expectedWorkingDays: z.number().optional(),
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

export const incentiveAttendanceSchema = z.object({
  id: z.string(),
  agentName: z.string(),
  userId: z.string().nullable().optional(),
  yearMonth: z.string(),
  presentDays: z.number(),
  workingDays: z.number(),
  lateCount: z.number(),
  earlyLeaveCount: z.number(),
  unapprovedAbsence: z.number(),
  fullAttendance: z.boolean(),
  attendanceBonusEligible: z.boolean(),
  note: z.string().nullable().optional(),
});
export type IncentiveAttendance = z.infer<typeof incentiveAttendanceSchema>;

export const incentiveSurveyLogSchema = z.object({
  id: z.string(),
  agentName: z.string(),
  assignmentId: z.string().nullable().optional(),
  yearMonth: z.string(),
  surveyCount: z.number(),
  note: z.string().nullable().optional(),
  recordedAt: z.string(),
});
export type IncentiveSurveyLog = z.infer<typeof incentiveSurveyLogSchema>;

export const incentiveChannelLogSchema = z.object({
  id: z.string(),
  agentName: z.string(),
  assignmentId: z.string().nullable().optional(),
  yearMonth: z.string(),
  channel: incentiveChannelSchema,
  activityCount: z.number(),
  note: z.string().nullable().optional(),
});
export type IncentiveChannelLog = z.infer<typeof incentiveChannelLogSchema>;

export const incentiveSpecialBonusSchema = z.object({
  id: z.string(),
  yearMonth: z.string(),
  agentName: z.string(),
  assignmentId: z.string().nullable().optional(),
  amountBdt: z.number(),
  reason: z.string(),
  createdByName: z.string().optional(),
  createdAt: z.string(),
});
export type IncentiveSpecialBonus = z.infer<typeof incentiveSpecialBonusSchema>;

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
  'below_daily_entry',
  'above_return_cap',
  'manual_missing',
  'final_warning',
  'terminated',
]);
export type IncentiveWarning = z.infer<typeof incentiveWarningSchema>;

export const incentivePerformanceLineSchema = z.object({
  assignmentId: z.string(),
  agentName: z.string(),
  userId: z.string().nullable().optional(),
  planId: z.string(),
  planName: z.string(),
  teamName: z.string().optional(),
  orgTeamId: z.string().nullable().optional(),
  metricType: incentiveMetricTypeSchema,
  actualValue: z.number(),
  rangeActualValue: z.number().nullable().optional(),
  matchedSlabId: z.string().nullable().optional(),
  matchedSlabLabel: z.string().nullable().optional(),
  monthlyTarget: z.number().nullable().optional(),
  entryTarget: z.number().nullable().optional(),
  dailyTarget: z.number().nullable().optional(),
  dailyAverage: z.number().nullable().optional(),
  incentiveBdt: z.number(),
  specialBonusBdt: z.number().optional(),
  attendanceBonusBdt: z.number().optional(),
  totalPayBdt: z.number().optional(),
  prorataApplied: z.boolean().optional(),
  manualOverride: z.boolean().optional(),
  consecutiveMissMonths: z.number().optional(),
  hrStatus: incentiveHrStatusSchema.optional(),
  attendanceBonusEligible: z.boolean().optional(),
  warning: incentiveWarningSchema.optional(),
  notes: z.string().optional(),
});
export type IncentivePerformanceLine = z.infer<typeof incentivePerformanceLineSchema>;

export const incentiveDailyPointSchema = z.object({
  date: z.string(),
  assignmentId: z.string(),
  agentName: z.string(),
  userId: z.string().nullable().optional(),
  planId: z.string(),
  teamName: z.string().optional(),
  orgTeamId: z.string().nullable().optional(),
  metricType: incentiveMetricTypeSchema,
  actualValue: z.number(),
  dailyTarget: z.number().nullable().optional(),
});
export type IncentiveDailyPoint = z.infer<typeof incentiveDailyPointSchema>;

export const incentivePerformanceReportSchema = z.object({
  yearMonth: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  workingDaysInMonth: z.number().optional(),
  lines: z.array(incentivePerformanceLineSchema),
  daily: z.array(incentiveDailyPointSchema).optional(),
  totalIncentiveBdt: z.number(),
  totalSpecialBonusBdt: z.number().optional(),
  totalAttendanceBonusBdt: z.number().optional(),
  totalPayBdt: z.number().optional(),
  warningCount: z.number().optional(),
  teamRollups: z
    .array(
      z.object({
        planId: z.string(),
        planName: z.string(),
        teamName: z.string().optional(),
        orgTeamId: z.string().nullable().optional(),
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
  specialBonusBdt: z.number().optional(),
  attendanceBonusBdt: z.number().optional(),
  totalPayBdt: z.number().optional(),
  matchedSlabLabel: z.string().nullable().optional(),
  warning: incentiveWarningSchema.optional(),
  hrStatus: incentiveHrStatusSchema.optional(),
  notes: z.string().optional(),
});
export type IncentivePayoutLine = z.infer<typeof incentivePayoutLineSchema>;

export const incentivePeriodRunSchema = z.object({
  id: z.string(),
  yearMonth: z.string(),
  status: incentivePeriodStatusSchema,
  totalIncentiveBdt: z.number(),
  totalSpecialBonusBdt: z.number().optional(),
  totalAttendanceBonusBdt: z.number().optional(),
  totalPayBdt: z.number().optional(),
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
  hrStatus: incentiveHrStatusSchema.optional(),
});
export type CreateIncentiveAssignmentPayload = z.infer<
  typeof createIncentiveAssignmentPayloadSchema
>;
export const updateIncentiveAssignmentPayloadSchema =
  createIncentiveAssignmentPayloadSchema.partial().extend({
    consecutiveMissMonths: z.number().int().optional(),
  });
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

export const upsertIncentiveAttendancePayloadSchema = z.object({
  agentName: z.string().min(1),
  userId: z.string().optional().nullable(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  presentDays: z.number().min(0),
  workingDays: z.number().min(1),
  lateCount: z.number().min(0).optional(),
  earlyLeaveCount: z.number().min(0).optional(),
  unapprovedAbsence: z.number().min(0).optional(),
  note: z.string().optional().nullable(),
});
export type UpsertIncentiveAttendancePayload = z.infer<
  typeof upsertIncentiveAttendancePayloadSchema
>;

export const upsertIncentiveSurveyPayloadSchema = z.object({
  agentName: z.string().min(1),
  assignmentId: z.string().optional().nullable(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  surveyCount: z.number().min(0),
  note: z.string().optional().nullable(),
});
export type UpsertIncentiveSurveyPayload = z.infer<typeof upsertIncentiveSurveyPayloadSchema>;

export const upsertIncentiveChannelPayloadSchema = z.object({
  agentName: z.string().min(1),
  assignmentId: z.string().optional().nullable(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  channel: incentiveChannelSchema,
  activityCount: z.number().min(0),
  note: z.string().optional().nullable(),
});
export type UpsertIncentiveChannelPayload = z.infer<typeof upsertIncentiveChannelPayloadSchema>;

export const createIncentiveSpecialBonusPayloadSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  agentName: z.string().min(1),
  assignmentId: z.string().optional().nullable(),
  amountBdt: z.number(),
  reason: z.string().min(1),
});
export type CreateIncentiveSpecialBonusPayload = z.infer<
  typeof createIncentiveSpecialBonusPayloadSchema
>;

export const incentiveOpsMonthSchema = z.object({
  yearMonth: z.string(),
  attendance: z.array(incentiveAttendanceSchema),
  surveys: z.array(incentiveSurveyLogSchema),
  channels: z.array(incentiveChannelLogSchema),
  specialBonuses: z.array(incentiveSpecialBonusSchema),
});
export type IncentiveOpsMonth = z.infer<typeof incentiveOpsMonthSchema>;
