import { z } from 'zod';

export const campaignStatusSchema = z.enum(['active', 'paused', 'ended']);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const campaignPlatformSchema = z.enum(['facebook', 'instagram', 'google']);
export type CampaignPlatform = z.infer<typeof campaignPlatformSchema>;

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: campaignStatusSchema,
  platform: campaignPlatformSchema,
  spendBdt: z.number(),
  budgetBdt: z.number(),
  leads: z.number(),
  orders: z.number(),
  revenueBdt: z.number(),
  roas: z.number(),
  startDate: z.string(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
  landingPageName: z.string().optional(),
  landingPageUrl: z.string().optional(),
});
export type Campaign = z.infer<typeof campaignSchema>;

export const campaignLandingPageSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  visits: z.number(),
  conversions: z.number(),
  conversionRate: z.number(),
});
export type CampaignLandingPage = z.infer<typeof campaignLandingPageSchema>;

export const campaignOverviewSchema = z.object({
  campaigns: z.array(campaignSchema),
  totalSpendBdt: z.number(),
  totalRevenueBdt: z.number(),
  avgRoas: z.number(),
  totalLeads: z.number(),
  landingPages: z.array(campaignLandingPageSchema),
});
export type CampaignOverview = z.infer<typeof campaignOverviewSchema>;

export const createCampaignPayloadSchema = z.object({
  name: z.string().min(1),
  status: campaignStatusSchema.optional(),
  platform: campaignPlatformSchema.optional(),
  budgetBdt: z.number().nonnegative().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  landingPageName: z.string().optional().nullable(),
  landingPageUrl: z.string().optional().nullable(),
});
export type CreateCampaignPayload = z.infer<typeof createCampaignPayloadSchema>;

export const updateCampaignPayloadSchema = z.object({
  name: z.string().min(1).optional(),
  status: campaignStatusSchema.optional(),
  platform: campaignPlatformSchema.optional(),
  budgetBdt: z.number().nonnegative().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  landingPageName: z.string().optional().nullable(),
  landingPageUrl: z.string().optional().nullable(),
});
export type UpdateCampaignPayload = z.infer<typeof updateCampaignPayloadSchema>;
