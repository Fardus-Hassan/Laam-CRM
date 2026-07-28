import { z } from 'zod';

export const uomDimensionSchema = z.enum([
  'count',
  'mass',
  'volume',
  'length',
  'area',
  'other',
]);
export type UomDimension = z.infer<typeof uomDimensionSchema>;

export const unitOfMeasureSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  dimension: uomDimensionSchema,
  factorToDimensionBase: z.number().positive(),
  isSystem: z.boolean(),
});

export type UnitOfMeasure = z.infer<typeof unitOfMeasureSchema>;

export const unitOfMeasureListResponseSchema = z.object({
  items: z.array(unitOfMeasureSchema),
  total: z.number(),
});

export type UnitOfMeasureListResponse = z.infer<typeof unitOfMeasureListResponseSchema>;

export const createUnitOfMeasurePayloadSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  dimension: uomDimensionSchema.default('count'),
  factorToDimensionBase: z.number().positive().default(1),
});

export type CreateUnitOfMeasurePayload = z.infer<typeof createUnitOfMeasurePayloadSchema>;

export const updateUnitOfMeasurePayloadSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(1).max(120).optional(),
  dimension: uomDimensionSchema.optional(),
  factorToDimensionBase: z.number().positive().optional(),
});

export type UpdateUnitOfMeasurePayload = z.infer<typeof updateUnitOfMeasurePayloadSchema>;

export const variantUomConversionSchema = z.object({
  uomId: z.string(),
  uomCode: z.string().optional(),
  factorToVariantBase: z.number().positive(),
});

export type VariantUomConversion = z.infer<typeof variantUomConversionSchema>;

export const createVariantUomConversionPayloadSchema = z.object({
  uomId: z.string().min(1),
  factorToVariantBase: z.number().positive(),
});

export type CreateVariantUomConversionPayload = z.infer<
  typeof createVariantUomConversionPayloadSchema
>;

/** Flexible unit code for mixer/purchase lines (validated server-side against org UoM). */
export const quantityWithUomSchema = z.object({
  quantity: z.number().positive(),
  uomId: z.string().optional(),
  uomCode: z.string().optional(),
});

export type QuantityWithUom = z.infer<typeof quantityWithUomSchema>;
