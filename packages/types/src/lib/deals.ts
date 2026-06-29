import { z } from 'zod';

export const dealStageSchema = z.enum([
  'new_lead',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
]);

export type DealStage = z.infer<typeof dealStageSchema>;

export const dealListItemSchema = z.object({
  id: z.string(),
  dealNumber: z.string(),
  title: z.string(),
  companyName: z.string(),
  contactName: z.string().optional(),
  stage: dealStageSchema,
  amount: z.number(),
  probability: z.number().int().min(0).max(100),
  expectedCloseDate: z.string().optional(),
  assignedAgentName: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DealListItem = z.infer<typeof dealListItemSchema>;

export const dealActivitySchema = z.object({
  id: z.string(),
  type: z.enum(['created', 'stage_change', 'note', 'call', 'email']),
  label: z.string(),
  description: z.string().optional(),
  timestamp: z.string(),
  actorName: z.string().optional(),
});

export type DealActivity = z.infer<typeof dealActivitySchema>;

export const dealDetailSchema = dealListItemSchema.extend({
  notes: z.string().optional(),
  activities: z.array(dealActivitySchema),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  wonAt: z.string().optional(),
  lostReason: z.string().optional(),
});

export type DealDetail = z.infer<typeof dealDetailSchema>;

export const dealListQuerySchema = z.object({
  stage: dealStageSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(50),
});

export type DealListQuery = z.infer<typeof dealListQuerySchema>;

export const dealListSummarySchema = z.object({
  count: z.number(),
  totalAmount: z.number(),
  weightedAmount: z.number(),
});

export type DealListSummary = z.infer<typeof dealListSummarySchema>;

export const dealListResponseSchema = z.object({
  items: z.array(dealListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: dealListSummarySchema,
});

export type DealListResponse = z.infer<typeof dealListResponseSchema>;

export const pipelineStageSummarySchema = z.object({
  stage: dealStageSchema,
  count: z.number(),
  totalAmount: z.number(),
  deals: z.array(dealListItemSchema),
});

export type PipelineStageSummary = z.infer<typeof pipelineStageSummarySchema>;

export const pipelineResponseSchema = z.object({
  stages: z.array(pipelineStageSummarySchema),
  summary: dealListSummarySchema,
});

export type PipelineResponse = z.infer<typeof pipelineResponseSchema>;
