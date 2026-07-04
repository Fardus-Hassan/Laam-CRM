import { z } from 'zod';

export const customerCourierScoreSchema = z.object({
  total: z.number().int().nonnegative(),
  success: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  rate: z.number().min(0).max(100),
});

export type CustomerCourierScore = z.infer<typeof customerCourierScoreSchema>;

export const customerProductHistorySchema = z.object({
  orderedAt: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive().optional(),
});

export type CustomerProductHistory = z.infer<typeof customerProductHistorySchema>;

export const customerStatusSchema = z.enum([
  'none',
  '2_time',
  '3_time',
  '5_time',
  '10_time',
  'premium',
  'repeat',
  'ramadan',
]);

export type CustomerStatus = z.infer<typeof customerStatusSchema>;

export const customerListItemSchema = z.object({
  id: z.string(),
  customerNumber: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  area: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  createdAt: z.string(),
  orderCount: z.number().int().nonnegative(),
  deliveredCount: z.number().int().nonnegative(),
  totalSpent: z.number().nonnegative(),
  courierScore: customerCourierScoreSchema,
  recentProducts: z.array(customerProductHistorySchema).default([]),
  tags: z.array(z.string()).default([]),
  status: customerStatusSchema,
  hasNotes: z.boolean().optional(),
  hasFollowUp: z.boolean().optional(),
  followUpDue: z.string().optional(),
  assignedAgentName: z.string().optional(),
  lastOrderAt: z.string().optional(),
});

export type CustomerListItem = z.infer<typeof customerListItemSchema>;

export const customerDetailSchema = customerListItemSchema.extend({
  notes: z.string().optional(),
  activities: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
        timestamp: z.string(),
      }),
    )
    .default([]),
});

export type CustomerDetail = z.infer<typeof customerDetailSchema>;

export const customerListQuerySchema = z.object({
  segment: z.string().optional(),
  status: customerStatusSchema.optional(),
  search: z.string().optional(),
  district: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
});

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

export const customerSegmentCountSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number(),
});

export type CustomerSegmentCount = z.infer<typeof customerSegmentCountSchema>;

export const customerListSummarySchema = z.object({
  count: z.number(),
  totalSpent: z.number(),
  avgCourierRate: z.number(),
  withFollowUpCount: z.number(),
});

export type CustomerListSummary = z.infer<typeof customerListSummarySchema>;

export const customerListResponseSchema = z.object({
  items: z.array(customerListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: customerListSummarySchema,
  segments: z.array(customerSegmentCountSchema),
});

export type CustomerListResponse = z.infer<typeof customerListResponseSchema>;
