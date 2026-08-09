import { z } from 'zod';

import { orderCourierStatsSchema } from './orders.js';

/**
 * Provider slug from BD Courier (or Pathao fallback).
 * Kept as string so new couriers from the API appear without a code change.
 */
export const courierHistoryProviderIdSchema = z.string().min(1);
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
  /** Wide wordmark / mark URL from upstream (typically ~3:1). */
  logo: z.string().optional(),
  /** Soft note for UI — avoid raw gateway errors when possible. */
  error: z.string().optional(),
  fetchedAt: z.string().optional(),
});

export type CourierProviderHistory = z.infer<typeof courierProviderHistorySchema>;

export const courierRiskVerdictSchema = z.object({
  level: z.string(),
  label: z.string(),
  action: z.string().optional(),
  color: z.string().optional(),
  reasons: z.array(z.string()).optional(),
});
export type CourierRiskVerdict = z.infer<typeof courierRiskVerdictSchema>;

export const courierFraudReportSchema = z.object({
  title: z.string().optional(),
  details: z.string().optional(),
  date: z.string().optional(),
  image: z.string().optional(),
  source: z.string().optional(),
});
export type CourierFraudReport = z.infer<typeof courierFraudReportSchema>;

export const courierPhoneHistorySchema = z.object({
  phone: z.string(),
  phoneNormalized: z.string(),
  /** Aggregate across providers that returned counts. */
  aggregate: orderCourierStatsSchema,
  providers: z.array(courierProviderHistorySchema),
  riskVerdict: courierRiskVerdictSchema.optional(),
  reports: z.array(courierFraudReportSchema).optional(),
  fetchedAt: z.string(),
  source: z.enum(['live', 'cache']),
  stale: z.boolean().optional(),
});

export type CourierPhoneHistory = z.infer<typeof courierPhoneHistorySchema>;

/** Preferred display order when present; unknown providers append after. */
export const COURIER_HISTORY_PROVIDER_ORDER: string[] = [
  'pathao',
  'steadfast',
  'redx',
  'carrybee',
  'paperfly',
  'parceldex',
  'courrierfast',
];

export const COURIER_HISTORY_PROVIDER_LABEL: Record<string, string> = {
  pathao: 'Pathao',
  steadfast: 'Steadfast',
  redx: 'RedX',
  carrybee: 'CarryBee',
  paperfly: 'Paperfly',
  parceldex: 'ParcelDex',
  courrierfast: 'CourrierFast',
};

export function courierHistoryLabel(providerId: string, fallbackName?: string): string {
  if (fallbackName?.trim()) return fallbackName.trim();
  return (
    COURIER_HISTORY_PROVIDER_LABEL[providerId] ??
    providerId.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Sort known providers first (catalog order), then any extras alphabetically. */
export function sortCourierHistoryProviders<T extends { provider: string }>(
  providers: T[],
): T[] {
  const rank = new Map(COURIER_HISTORY_PROVIDER_ORDER.map((id, i) => [id, i]));
  return [...providers].sort((a, b) => {
    const ra = rank.get(a.provider);
    const rb = rank.get(b.provider);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a.provider.localeCompare(b.provider);
  });
}
