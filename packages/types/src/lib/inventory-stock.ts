import { z } from 'zod';

/** A single stock movement (audit trail entry) for a product variant. */
export const stockMovementSchema = z.object({
  id: z.string(),
  organizationId: z.string().optional(),
  productId: z.string(),
  variantId: z.string(),
  variantLabel: z.string().optional(),
  variantSku: z.string().optional(),
  delta: z.number().int(),
  previousStock: z.number().int(),
  newStock: z.number().int(),
  reason: z.string(),
  note: z.string().optional(),
  actorUserId: z.string().optional(),
  actorName: z.string().optional(),
  createdAt: z.string(),
});

export type StockMovement = z.infer<typeof stockMovementSchema>;

export const stockMovementListResponseSchema = z.object({
  items: z.array(stockMovementSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type StockMovementListResponse = z.infer<typeof stockMovementListResponseSchema>;

/** Payload for the dedicated per-variant stock adjustment endpoint. */
export const adjustStockPayloadSchema = z.object({
  variantId: z.string().min(1),
  delta: z
    .number()
    .int()
    .refine((value) => value !== 0, { message: 'Delta must not be 0' }),
  reason: z.string().min(1).max(200),
  note: z.string().max(2000).optional(),
});

export type AdjustStockPayload = z.infer<typeof adjustStockPayloadSchema>;
