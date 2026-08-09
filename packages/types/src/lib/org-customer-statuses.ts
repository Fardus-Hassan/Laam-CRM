import { z } from 'zod';

export const orgCustomerStatusSchema = z.object({
  id: z.string(),
  organizationId: z.string().optional(),
  slug: z.string().min(1),
  label: z.string().min(1),
  color: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isSystem: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type OrgCustomerStatus = z.infer<typeof orgCustomerStatusSchema>;

export const upsertOrgCustomerStatusPayloadSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1).optional(),
  label: z.string().min(1),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type UpsertOrgCustomerStatusPayload = z.infer<
  typeof upsertOrgCustomerStatusPayloadSchema
>;
