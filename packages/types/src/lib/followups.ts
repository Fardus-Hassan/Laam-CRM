import { z } from 'zod';

import { customerProductHistorySchema } from './customers.js';
import { orderSourceSchema } from './orders.js';

export const followupQueueSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export type FollowupQueue = z.infer<typeof followupQueueSchema>;

export const followupStatusSchema = z.enum([
  'no_status',
  'pending',
  'done',
  'converted',
]);

export type FollowupStatus = z.infer<typeof followupStatusSchema>;

export const followupTypeSchema = z.enum(['listed', 'repeat', 'vip']);

export type FollowupType = z.infer<typeof followupTypeSchema>;

export const followupSmsStatusSchema = z.enum(['not_sent', 'sent']);

export type FollowupSmsStatus = z.infer<typeof followupSmsStatusSchema>;

export const followupListItemSchema = z.object({
  id: z.string(),
  queue: followupQueueSchema,
  customerId: z.string(),
  customerNumber: z.string(),
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
  scheduleDate: z.string().optional(),
  skipped: z.boolean().default(false),
  name: z.string(),
  phone: z.string(),
  address: z.string().optional(),
  area: z.string().optional(),
  district: z.string().optional(),
  followupNotes: z.string().optional(),
  customerNotes: z.string().optional(),
  hasFollowupNotes: z.boolean().optional(),
  hasCustomerNotes: z.boolean().optional(),
  followupStatus: followupStatusSchema,
  type: followupTypeSchema,
  recentProducts: z.array(customerProductHistorySchema).default([]),
  tags: z.array(z.string()).default([]),
  smsStatus: followupSmsStatusSchema,
  assignedAgentName: z.string().optional(),
  source: orderSourceSchema,
  createdAt: z.string(),
});

export type FollowupListItem = z.infer<typeof followupListItemSchema>;

export const followupDetailSchema = followupListItemSchema.extend({
  activities: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
        timestamp: z.string(),
        actorName: z.string().optional(),
      }),
    )
    .default([]),
});

export type FollowupDetail = z.infer<typeof followupDetailSchema>;

export const followupFilterSchema = z.enum(['all', 'today', 'no_status']);

export type FollowupFilter = z.infer<typeof followupFilterSchema>;

export const followupListQuerySchema = z.object({
  queue: followupQueueSchema.default(1),
  filter: followupFilterSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
});

export type FollowupListQuery = z.infer<typeof followupListQuerySchema>;

export const followupFilterCountSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number(),
});

export type FollowupFilterCount = z.infer<typeof followupFilterCountSchema>;

export const followupListSummarySchema = z.object({
  count: z.number(),
  todayCount: z.number(),
  noStatusCount: z.number(),
  queueCount: z.number(),
  queueCounts: z
    .object({
      1: z.number(),
      2: z.number(),
      3: z.number(),
    })
    .optional(),
});

export type FollowupListSummary = z.infer<typeof followupListSummarySchema>;

export const followupListResponseSchema = z.object({
  items: z.array(followupListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: followupListSummarySchema,
  filters: z.array(followupFilterCountSchema),
});

export type FollowupListResponse = z.infer<typeof followupListResponseSchema>;

export const updateFollowupPayloadSchema = z.object({
  scheduleDate: z.string().optional(),
  followupStatus: followupStatusSchema.optional(),
  followupNotes: z.string().optional(),
  customerNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  skipped: z.boolean().optional(),
  assignedAgentName: z.string().optional(),
});

export type UpdateFollowupPayload = z.infer<typeof updateFollowupPayloadSchema>;
