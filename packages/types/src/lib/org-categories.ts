import { z } from 'zod';

export const orgCategoryKindSchema = z.enum(['product', 'income', 'expense', 'knowledge']);
export type OrgCategoryKind = z.infer<typeof orgCategoryKindSchema>;

export const orgCategorySchema = z.object({
  id: z.string(),
  organizationId: z.string().optional(),
  kind: orgCategoryKindSchema,
  slug: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  /** System categories are used by automations / ops spine and cannot be deleted. */
  isSystem: z.boolean().default(false),
  deletedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type OrgCategory = z.infer<typeof orgCategorySchema>;

export const upsertOrgCategoryPayloadSchema = orgCategorySchema
  .omit({ id: true })
  .extend({ id: z.string().optional() });

export type UpsertOrgCategoryPayload = z.infer<typeof upsertOrgCategoryPayloadSchema>;
