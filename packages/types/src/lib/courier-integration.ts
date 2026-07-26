import { z } from 'zod';

export const pathaoEnvironmentSchema = z.enum(['sandbox', 'live']);
export type PathaoEnvironment = z.infer<typeof pathaoEnvironmentSchema>;

export const pathaoIntegrationSettingsSchema = z.object({
  provider: z.literal('pathao'),
  enabled: z.boolean(),
  environment: pathaoEnvironmentSchema,
  storeId: z.string().nullable(),
  hasCredentials: z.boolean(),
  clientIdMasked: z.string().nullable(),
  usernameMasked: z.string().nullable(),
  syncIntervalSec: z.number().int(),
  lastSyncAt: z.string().nullable(),
  lastError: z.string().nullable(),
  updatedAt: z.string(),
});

export type PathaoIntegrationSettings = z.infer<typeof pathaoIntegrationSettingsSchema>;

export const upsertPathaoIntegrationPayloadSchema = z.object({
  enabled: z.boolean().optional(),
  environment: pathaoEnvironmentSchema.optional(),
  storeId: z.string().nullable().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  baseUrl: z.string().optional(),
  syncIntervalSec: z.number().int().min(60).max(3600).optional(),
});

export type UpsertPathaoIntegrationPayload = z.infer<
  typeof upsertPathaoIntegrationPayloadSchema
>;

export const courierStatusMapSchema = z.object({
  id: z.string(),
  provider: z.string(),
  slug: z.string(),
  label: z.string(),
  crmStatus: z.string().nullable(),
  isTerminal: z.boolean(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

export type CourierStatusMap = z.infer<typeof courierStatusMapSchema>;

export const upsertCourierStatusMapPayloadSchema = z.object({
  id: z.string().optional(),
  provider: z.string().optional(),
  slug: z.string(),
  label: z.string(),
  crmStatus: z.string().nullable().optional(),
  isTerminal: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type UpsertCourierStatusMapPayload = z.infer<
  typeof upsertCourierStatusMapPayloadSchema
>;

export const carrybeeEnvironmentSchema = z.enum(['sandbox', 'live']);
export type CarrybeeEnvironment = z.infer<typeof carrybeeEnvironmentSchema>;

export const carrybeeIntegrationSettingsSchema = z.object({
  provider: z.literal('carrybee'),
  enabled: z.boolean(),
  environment: carrybeeEnvironmentSchema,
  storeId: z.string().nullable(),
  hasCredentials: z.boolean(),
  clientIdMasked: z.string().nullable(),
  clientContextMasked: z.string().nullable(),
  syncIntervalSec: z.number().int(),
  lastSyncAt: z.string().nullable(),
  lastError: z.string().nullable(),
  updatedAt: z.string(),
});

export type CarrybeeIntegrationSettings = z.infer<
  typeof carrybeeIntegrationSettingsSchema
>;

export const upsertCarrybeeIntegrationPayloadSchema = z.object({
  enabled: z.boolean().optional(),
  environment: carrybeeEnvironmentSchema.optional(),
  storeId: z.string().nullable().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  clientContext: z.string().optional(),
  baseUrl: z.string().optional(),
  syncIntervalSec: z.number().int().min(60).max(3600).optional(),
});

export type UpsertCarrybeeIntegrationPayload = z.infer<
  typeof upsertCarrybeeIntegrationPayloadSchema
>;
