import { z } from 'zod';

import { orderCourierStatsSchema } from './orders.js';

/** Couriers shown in network fraud/success UI (MVP catalog). */
export const courierHistoryProviderIdSchema = z.enum([
  'pathao',
  'steadfast',
  'redx',
  'carrybee',
  'paperfly',
]);
export type CourierHistoryProviderId = z.infer<typeof courierHistoryProviderIdSchema>;

export const courierProviderHistoryStatusSchema = z.enum([
  /** Live lookup attempted / counts may be present */
  'ready',
  /** Planned — not wired yet */
  'soon',
  /** Connected but history not available from this source */
  'unavailable',
]);
export type CourierProviderHistoryStatus = z.infer<
  typeof courierProviderHistoryStatusSchema
>;

export const courierProviderHistorySchema = z.object({
  provider: courierHistoryProviderIdSchema,
  label: z.string(),
  connected: z.boolean(),
  available: z.boolean(),
  /** False when provider only returns a rating (no To/Su/Fa counts). */
  countsAvailable: z.boolean().default(true),
  status: courierProviderHistoryStatusSchema.optional(),
  stats: orderCourierStatsSchema.optional(),
  rating: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  /** Soft note for UI — avoid raw gateway errors when possible. */
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

/** Display order for Bizmation-style network table. */
export const COURIER_HISTORY_PROVIDER_ORDER: CourierHistoryProviderId[] = [
  'pathao',
  'steadfast',
  'redx',
  'carrybee',
  'paperfly',
];

export const COURIER_HISTORY_PROVIDER_LABEL: Record<CourierHistoryProviderId, string> = {
  pathao: 'Pathao',
  steadfast: 'Steadfast',
  redx: 'RedX',
  carrybee: 'Carrybee',
  paperfly: 'Paperfly',
};
