import { z } from 'zod';

import { orderSourceSchema } from './orders.js';

export const contactListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  source: orderSourceSchema,
  assignedAgentName: z.string().optional(),
  lastContactAt: z.string().optional(),
  createdAt: z.string(),
});

export type ContactListItem = z.infer<typeof contactListItemSchema>;

export const contactActivitySchema = z.object({
  id: z.string(),
  type: z.enum(['call', 'email', 'meeting', 'note', 'order']),
  label: z.string(),
  description: z.string().optional(),
  timestamp: z.string(),
  actorName: z.string().optional(),
});

export type ContactActivity = z.infer<typeof contactActivitySchema>;

export const contactDetailSchema = contactListItemSchema.extend({
  address: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  activities: z.array(contactActivitySchema),
  companyId: z.string().optional(),
  leadId: z.string().optional(),
});

export type ContactDetail = z.infer<typeof contactDetailSchema>;

export const contactListQuerySchema = z.object({
  source: orderSourceSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
});

export type ContactListQuery = z.infer<typeof contactListQuerySchema>;

export const contactListSummarySchema = z.object({
  count: z.number(),
  withCompanyCount: z.number(),
});

export type ContactListSummary = z.infer<typeof contactListSummarySchema>;

export const contactListResponseSchema = z.object({
  items: z.array(contactListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: contactListSummarySchema,
});

export type ContactListResponse = z.infer<typeof contactListResponseSchema>;
