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
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  activities: z.array(leadActivitySchema),
  companyName: z.string().optional(),
  orderId: z.string().optional(),
  convertedAt: z.string().optional(),
});

export type LeadDetail = z.infer<typeof leadDetailSchema>;

export const leadListQuerySchema = z.object({
  status: z.union([leadStatusSchema, z.literal('unassigned')]).optional(),
  source: orderSourceSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
});

export type LeadListQuery = z.infer<typeof leadListQuerySchema>;

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
