import { z } from 'zod';

import {
  customerCourierScoreSchema,
  customerProductHistorySchema,
} from './customers.js';
import { orderSourceSchema } from './orders.js';

export const contactTypeSchema = z.enum(['customer', 'supplier', 'partner', 'other']);

export type ContactType = z.infer<typeof contactTypeSchema>;

export const contactListItemSchema = z.object({
  id: z.string(),
  contactNumber: z.string().optional(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  contactType: contactTypeSchema,
  organizationName: z.string().optional(),
  roleLabel: z.string().optional(),
  source: orderSourceSchema,
  area: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  assignedAgentName: z.string().optional(),
  lastContactAt: z.string().optional(),
  createdAt: z.string(),
  orderCount: z.number().int().nonnegative().optional(),
  deliveredCount: z.number().int().nonnegative().optional(),
  totalSpent: z.number().nonnegative().optional(),
  courierScore: customerCourierScoreSchema.optional(),
  recentProducts: z.array(customerProductHistorySchema).default([]),
  tags: z.array(z.string()).default([]),
  hasNotes: z.boolean().optional(),
  hasFollowUp: z.boolean().optional(),
  followUpDue: z.string().optional(),
  customerId: z.string().optional(),
  leadId: z.string().optional(),
});

export type ContactListItem = z.infer<typeof contactListItemSchema>;

export const contactActivitySchema = z.object({
  id: z.string(),
  type: z.enum(['call', 'email', 'meeting', 'note', 'order', 'whatsapp']),
  label: z.string(),
  description: z.string().optional(),
  timestamp: z.string(),
  actorName: z.string().optional(),
});

export type ContactActivity = z.infer<typeof contactActivitySchema>;

export const contactDetailSchema = contactListItemSchema.extend({
  notes: z.string().optional(),
  activities: z.array(contactActivitySchema),
});

export type ContactDetail = z.infer<typeof contactDetailSchema>;

export const contactListQuerySchema = z.object({
  segment: z.string().optional(),
  contactType: contactTypeSchema.optional(),
  source: orderSourceSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
});

export type ContactListQuery = z.infer<typeof contactListQuerySchema>;

export const contactSegmentCountSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number(),
});

export type ContactSegmentCount = z.infer<typeof contactSegmentCountSchema>;

export const contactListSummarySchema = z.object({
  count: z.number(),
  customerCount: z.number(),
  supplierCount: z.number(),
  avgCourierRate: z.number(),
});

export type ContactListSummary = z.infer<typeof contactListSummarySchema>;

export const contactListResponseSchema = z.object({
  items: z.array(contactListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: contactListSummarySchema,
  segments: z.array(contactSegmentCountSchema),
});

export type ContactListResponse = z.infer<typeof contactListResponseSchema>;

export const createContactPayloadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  contactType: contactTypeSchema.default('customer'),
  organizationName: z.string().optional(),
  roleLabel: z.string().optional(),
  source: orderSourceSchema.default('call'),
  area: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  assignedAgentName: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateContactPayload = z.infer<typeof createContactPayloadSchema>;
