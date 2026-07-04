import { z } from 'zod';

export const companyStatusSchema = z.enum(['active', 'inactive', 'prospect']);

export type CompanyStatus = z.infer<typeof companyStatusSchema>;

export const companyListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: z.string().optional(),
  status: companyStatusSchema,
  phone: z.string().optional(),
  email: z.string().email().optional(),
  contactCount: z.number().int().nonnegative(),
  dealValue: z.number().nonnegative(),
  assignedAgentName: z.string().optional(),
  city: z.string().optional(),
  createdAt: z.string(),
});

export type CompanyListItem = z.infer<typeof companyListItemSchema>;

export const companyDetailSchema = companyListItemSchema.extend({
  address: z.string().optional(),
  website: z.string().url().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  contactIds: z.array(z.string()).default([]),
  dealIds: z.array(z.string()).default([]),
});

export type CompanyDetail = z.infer<typeof companyDetailSchema>;

export const companyListQuerySchema = z.object({
  status: companyStatusSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
});

export type CompanyListQuery = z.infer<typeof companyListQuerySchema>;

export const companyListSummarySchema = z.object({
  count: z.number(),
  totalDealValue: z.number(),
  activeCount: z.number(),
});

export type CompanyListSummary = z.infer<typeof companyListSummarySchema>;

export const companyListResponseSchema = z.object({
  items: z.array(companyListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: companyListSummarySchema,
});

export type CompanyListResponse = z.infer<typeof companyListResponseSchema>;
