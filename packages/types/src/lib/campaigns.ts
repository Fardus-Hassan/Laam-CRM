import { z } from 'zod';

export const campaignStatusSchema = z.enum(['active', 'paused', 'ended']);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: campaignStatusSchema,
  platform: z.enum(['facebook', 'instagram', 'google']),
  spendBdt: z.number(),
  budgetBdt: z.number(),
  leads: z.number(),
  orders: z.number(),
  revenueBdt: z.number(),
  roas: z.number(),
  startDate: z.string(),
  endDate: z.string().optional(),
});
export type Campaign = z.infer<typeof campaignSchema>;

export const campaignOverviewSchema = z.object({
  campaigns: z.array(campaignSchema),
  totalSpendBdt: z.number(),
  totalRevenueBdt: z.number(),
  avgRoas: z.number(),
  totalLeads: z.number(),
  landingPages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      url: z.string(),
      visits: z.number(),
      conversions: z.number(),
      conversionRate: z.number(),
    }),
  ),
});
export type CampaignOverview = z.infer<typeof campaignOverviewSchema>;
