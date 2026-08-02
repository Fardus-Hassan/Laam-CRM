import { z } from 'zod';

import { orderCourierStatsSchema } from './orders.js';

export const courierHistoryProviderIdSchema = z.enum(['pathao', 'carrybee']);
export type CourierHistoryProviderId = z.infer<typeof courierHistoryProviderIdSchema>;

export const courierProviderHistorySchema = z.object({
  provider: courierHistoryProviderIdSchema,
  label: z.string(),
  connected: z.boolean(),
  available: z.boolean(),
  /** False when provider only returns a rating (no To/Su/Fa counts). */
  countsAvailable: z.boolean().default(true),
  stats: orderCourierStatsSchema.optional(),
  rating: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  error: z.string().optional(),
  fetchedAt: z.string().optional(),
});

export type CourierProviderHistory = z.infer<typeof courierProviderHistorySchema>;

export const courierPhoneHistorySchema = z.object({
  phone: z.string(),
  phoneNormalized: z.string(),
  /** Aggregate across providers that returned counts. */
  aggregate: orderCourierStatsSchema,
  providers: z.array(courierProviderHistorySchema),
  fetchedAt: z.string(),
  source: z.enum(['live', 'cache']),
  stale: z.boolean().optional(),
});

export type CourierPhoneHistory = z.infer<typeof courierPhoneHistorySchema>;
