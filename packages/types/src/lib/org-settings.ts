import { z } from 'zod';

export const orgProfileSchema = z.object({
  name: z.string(),
  slug: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
  district: z.string(),
  logoUrl: z.string().optional(),
  website: z.string().optional(),
  timezone: z.string(),
  currency: z.string(),
  orderPrefix: z.string(),
  defaultCourier: z.string(),
});

export type OrgProfile = z.infer<typeof orgProfileSchema>;

export const integrationProviderSchema = z.enum([
  'steadfast',
  'pathao',
  'redx',
  'facebook',
  'bkash',
  'nagad',
  'smtp',
  'woocommerce',
]);

export type IntegrationProvider = z.infer<typeof integrationProviderSchema>;

export const integrationStatusSchema = z.enum(['connected', 'disconnected', 'error', 'pending']);
export type IntegrationStatus = z.infer<typeof integrationStatusSchema>;

export const integrationConfigSchema = z.object({
  id: z.string(),
  provider: integrationProviderSchema,
  label: z.string(),
  status: integrationStatusSchema,
  lastSyncAt: z.string().optional(),
  errorMessage: z.string().optional(),
  config: z.record(z.string(), z.string()).optional(),
});

export type IntegrationConfig = z.infer<typeof integrationConfigSchema>;

export const orgSettingsSchema = z.object({
  profile: orgProfileSchema,
  integrations: z.array(integrationConfigSchema),
});

export type OrgSettings = z.infer<typeof orgSettingsSchema>;

export const updateOrgProfilePayloadSchema = orgProfileSchema.partial();
export type UpdateOrgProfilePayload = z.infer<typeof updateOrgProfilePayloadSchema>;

export const updateIntegrationPayloadSchema = z.object({
  provider: integrationProviderSchema,
  config: z.record(z.string(), z.string()),
});

export type UpdateIntegrationPayload = z.infer<typeof updateIntegrationPayloadSchema>;
