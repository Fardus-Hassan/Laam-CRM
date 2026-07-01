import { z } from 'zod';

import { orderSourceSchema } from './orders.js';

export const leadStatusSchema = z.enum([
  'new',
  'contacted',
  'qualified',
  'converted',
  'lost',
]);

export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const leadLineItemSchema = z.object({
  id: z.string(),
  productName: z.string(),
  sku: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export type LeadLineItem = z.infer<typeof leadLineItemSchema>;

export const leadListItemSchema = z.object({
  id: z.string(),
  leadNumber: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  source: orderSourceSchema,
  status: leadStatusSchema,
  assignedAgentName: z.string().optional(),
  area: z.string().optional(),
  estimatedValue: z.number().optional(),
  campaignName: z.string().optional(),
  createdAt: z.string(),
  lastActivityAt: z.string().optional(),
  productSummary: z.string().optional(),
  itemCount: z.number().optional(),
  hasNotes: z.boolean().optional(),
  followUpDue: z.string().optional(),
});

export type LeadListItem = z.infer<typeof leadListItemSchema>;

export const leadActivitySchema = z.object({
  id: z.string(),
  type: z.enum(['created', 'call', 'email', 'note', 'assigned', 'converted', 'status_change']),
  label: z.string(),
  description: z.string().optional(),
  timestamp: z.string(),
  actorName: z.string().optional(),
});

export type LeadActivity = z.infer<typeof leadActivitySchema>;

export const leadDetailSchema = leadListItemSchema.extend({
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  lineItems: z.array(leadLineItemSchema).default([]),
  activities: z.array(leadActivitySchema),
  companyName: z.string().optional(),
  orderId: z.string().optional(),
  convertedAt: z.string().optional(),
});

export type LeadDetail = z.infer<typeof leadDetailSchema>;

export const leadListQuerySchema = z.object({
  status: z.union([leadStatusSchema, z.literal('unassigned')]).optional(),
  source: orderSourceSchema.optional(),
  agent: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
});

export type LeadListQuery = z.infer<typeof leadListQuerySchema>;

export const createLeadLinePayloadSchema = z.object({
  productName: z.string(),
  sku: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

export type CreateLeadLinePayload = z.infer<typeof createLeadLinePayloadSchema>;

export const createLeadPayloadSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  area: z.string().optional(),
  address: z.string().optional(),
  source: orderSourceSchema,
  campaignName: z.string().optional(),
  estimatedValue: z.number().optional(),
  assignedAgentName: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lineItems: z.array(createLeadLinePayloadSchema).optional(),
});

export type CreateLeadPayload = z.infer<typeof createLeadPayloadSchema>;

export const leadListSummarySchema = z.object({
  count: z.number(),
  totalEstimatedValue: z.number(),
  unassignedCount: z.number(),
});

export type LeadListSummary = z.infer<typeof leadListSummarySchema>;

export const leadListResponseSchema = z.object({
  items: z.array(leadListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: leadListSummarySchema,
});

export type LeadListResponse = z.infer<typeof leadListResponseSchema>;

export const leadPipelineStageSchema = z.object({
  id: z.union([leadStatusSchema, z.literal('all'), z.literal('unassigned')]),
  label: z.string(),
  count: z.number(),
  color: z.string(),
  share: z.number(),
});

export type LeadPipelineStage = z.infer<typeof leadPipelineStageSchema>;

export const leadPipelineQuerySchema = z.object({
  source: orderSourceSchema.optional(),
  agent: z.string().optional(),
});

export type LeadPipelineQuery = z.infer<typeof leadPipelineQuerySchema>;

export const leadPipelineStatsSchema = z.object({
  stages: z.array(leadPipelineStageSchema),
  totalCount: z.number(),
  totalEstimatedValue: z.number(),
  unassignedCount: z.number(),
  convertedCount: z.number(),
  conversionRate: z.number(),
});

export type LeadPipelineStats = z.infer<typeof leadPipelineStatsSchema>;
