import { z } from 'zod';

export const websitePlatformSchema = z.enum(['woocommerce', 'custom']);
export type WebsitePlatform = z.infer<typeof websitePlatformSchema>;

export const websiteStoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Stable key for docs / logs (unique per org). */
  slug: z.string(),
  platform: websitePlatformSchema,
  enabled: z.boolean(),
  storeUrl: z.string().nullable(),
  hasIngestToken: z.boolean(),
  /** Present only right after create/rotate — show once. */
  ingestToken: z.string().optional(),
  hasWooCredentials: z.boolean(),
  lastIngestAt: z.string().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WebsiteStore = z.infer<typeof websiteStoreSchema>;

export const createWebsiteStorePayloadSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  platform: websitePlatformSchema,
  enabled: z.boolean().optional(),
  storeUrl: z.string().url().optional().nullable(),
  /** WooCommerce REST consumer key (optional; for future pull). Leave blank to skip. */
  wooConsumerKey: z.string().optional(),
  wooConsumerSecret: z.string().optional(),
});

export type CreateWebsiteStorePayload = z.infer<typeof createWebsiteStorePayloadSchema>;

export const updateWebsiteStorePayloadSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
  storeUrl: z.string().url().optional().nullable(),
  wooConsumerKey: z.string().optional(),
  /** Leave blank to keep existing secret. */
  wooConsumerSecret: z.string().optional(),
});

export type UpdateWebsiteStorePayload = z.infer<typeof updateWebsiteStorePayloadSchema>;

/** Canonical ingest line — industry-standard normalized shape. */
export const websiteOrderIngestLineSchema = z.object({
  sku: z.string().optional(),
  productName: z.string().min(1),
  variationLabel: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().optional(),
});

export type WebsiteOrderIngestLine = z.infer<typeof websiteOrderIngestLineSchema>;

/**
 * Canonical website → CRM order payload.
 * Custom sites POST this directly. WooCommerce adapter maps into this.
 */
export const websiteOrderIngestPayloadSchema = z.object({
  externalOrderId: z.string().min(1).max(120),
  customerName: z.string().min(1),
  customerPhone: z.string().min(5),
  customerEmail: z.string().email().optional().or(z.literal('')),
  altMobile: z.string().optional(),
  shippingAddress: z.string().min(1),
  shippingArea: z.string().optional(),
  district: z.string().optional(),
  paymentMethod: z.string().optional(),
  paidAmount: z.number().nonnegative().optional(),
  deliveryCharge: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  orderDate: z.string().optional(),
  utmSource: z.string().optional(),
  utmId: z.string().optional(),
  utmContent: z.string().optional(),
  utmCampaign: z.string().optional(),
  lineItems: z.array(websiteOrderIngestLineSchema).min(1),
});

export type WebsiteOrderIngestPayload = z.infer<typeof websiteOrderIngestPayloadSchema>;

export const websiteOrderIngestResultSchema = z.object({
  ok: z.boolean(),
  duplicate: z.boolean().default(false),
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
  unmatchedSkus: z.array(z.string()).default([]),
  message: z.string().optional(),
});

export type WebsiteOrderIngestResult = z.infer<typeof websiteOrderIngestResultSchema>;
