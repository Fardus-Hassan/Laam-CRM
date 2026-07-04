import { z } from 'zod';

export const dashboardStatsSchema = z.object({
  pipelineValue: z.string(),
  openDeals: z.number().int().nonnegative(),
  newLeads: z.number().int().nonnegative(),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  pipelineValue: '৳ 12.4L',
  openDeals: 28,
  newLeads: 14,
};
