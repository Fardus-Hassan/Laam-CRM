import { z } from 'zod';

export const recycleEntityTypeSchema = z.enum([
  'order',
  'customer',
  'product',
  'lead',
  'contact',
]);
export type RecycleEntityType = z.infer<typeof recycleEntityTypeSchema>;

export const recycleBinItemSchema = z.object({
  id: z.string(),
  entityType: recycleEntityTypeSchema,
  entityId: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  deletedBy: z.string(),
  deletedAt: z.string(),
  purgeAt: z.string(),
});
export type RecycleBinItem = z.infer<typeof recycleBinItemSchema>;

export const recycleListQuerySchema = z.object({
  entityType: recycleEntityTypeSchema.optional(),
  search: z.string().optional(),
});
export type RecycleListQuery = z.infer<typeof recycleListQuerySchema>;
