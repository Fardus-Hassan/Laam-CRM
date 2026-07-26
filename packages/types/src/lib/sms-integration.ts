import { z } from 'zod';

export const smsHttpMethodSchema = z.enum(['GET', 'POST']);
export type SmsHttpMethod = z.infer<typeof smsHttpMethodSchema>;

export const smsIntegrationSettingsSchema = z.object({
  provider: z.literal('custom'),
  enabled: z.boolean(),
  hasCredentials: z.boolean(),
  apiUrlMasked: z.string().nullable(),
  httpMethod: smsHttpMethodSchema,
  paramsTemplateMasked: z.string().nullable(),
  hasHeaders: z.boolean(),
  lastSentAt: z.string().nullable(),
  lastError: z.string().nullable(),
  updatedAt: z.string(),
});

export type SmsIntegrationSettings = z.infer<typeof smsIntegrationSettingsSchema>;

export const upsertSmsIntegrationPayloadSchema = z.object({
  enabled: z.boolean().optional(),
  apiUrl: z.string().min(8).optional(),
  httpMethod: smsHttpMethodSchema.optional(),
  /** Full query/body template. May include secrets (api_token=...). Leave blank to keep. */
  paramsTemplate: z.string().optional(),
  /** Optional JSON object string for headers. Leave blank to keep. Empty string clears. */
  headersJson: z.string().optional().nullable(),
});

export type UpsertSmsIntegrationPayload = z.infer<
  typeof upsertSmsIntegrationPayloadSchema
>;

export const smsTemplateSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  message: z.string(),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
  updatedAt: z.string(),
});

export type SmsTemplate = z.infer<typeof smsTemplateSchema>;

export const upsertSmsTemplatePayloadSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1),
  label: z.string().min(1),
  message: z.string(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type UpsertSmsTemplatePayload = z.infer<typeof upsertSmsTemplatePayloadSchema>;

export const sendSmsTestPayloadSchema = z.object({
  phone: z.string().min(8),
  message: z.string().min(1).max(1000).optional(),
});

export type SendSmsTestPayload = z.infer<typeof sendSmsTestPayloadSchema>;

export const sendOrderSmsPayloadSchema = z.object({
  message: z.string().min(1).max(1000),
  templateId: z.string().optional(),
});

export type SendOrderSmsPayload = z.infer<typeof sendOrderSmsPayloadSchema>;

export const sendBulkOrderSmsPayloadSchema = z.object({
  orderIds: z.array(z.string()).min(1),
  message: z.string().min(1).max(1000),
});

export type SendBulkOrderSmsPayload = z.infer<typeof sendBulkOrderSmsPayloadSchema>;

export const sendSmsResultSchema = z.object({
  ok: z.boolean(),
  toPhone: z.string(),
  logId: z.string().optional(),
  message: z.string().optional(),
});

export type SendSmsResult = z.infer<typeof sendSmsResultSchema>;
