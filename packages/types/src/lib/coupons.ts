import { z } from 'zod';

export const couponTypeSchema = z.enum(['percent', 'fixed']);
export type CouponType = z.infer<typeof couponTypeSchema>;

export const couponSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: couponTypeSchema,
  value: z.number(),
  minOrderBdt: z.number().optional(),
  maxDiscountBdt: z.number().optional(),
  usageCount: z.number(),
  usageLimit: z.number().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean(),
  description: z.string().optional(),
});
export type Coupon = z.infer<typeof couponSchema>;

export const createCouponPayloadSchema = z.object({
  code: z.string().min(2),
  type: couponTypeSchema,
  value: z.number().min(1),
  minOrderBdt: z.number().optional(),
  maxDiscountBdt: z.number().optional(),
  usageLimit: z.number().optional(),
  expiresAt: z.string().optional(),
  description: z.string().optional(),
});
export type CreateCouponPayload = z.infer<typeof createCouponPayloadSchema>;

export const updateCouponPayloadSchema = createCouponPayloadSchema.partial().extend({
  isActive: z.boolean().optional(),
  minOrderBdt: z.number().nullable().optional(),
  maxDiscountBdt: z.number().nullable().optional(),
  usageLimit: z.number().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type UpdateCouponPayload = z.infer<typeof updateCouponPayloadSchema>;
