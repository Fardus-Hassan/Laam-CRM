import { z } from 'zod';

export const productBrandSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  deletedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProductBrand = z.infer<typeof productBrandSchema>;

export const createProductBrandPayloadSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateProductBrandPayload = z.infer<typeof createProductBrandPayloadSchema>;

export const updateProductBrandPayloadSchema = createProductBrandPayloadSchema.partial();

export type UpdateProductBrandPayload = z.infer<typeof updateProductBrandPayloadSchema>;
