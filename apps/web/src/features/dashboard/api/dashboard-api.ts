import { apiRequest } from '@/lib/api/client';
import { crmEndpoints } from '@/lib/api/endpoints';
import {
  dashboardStatsSchema,
  MOCK_DASHBOARD_STATS,
  type DashboardStats,
} from '@/features/dashboard/types';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const data = await apiRequest<unknown>(crmEndpoints.dashboardStats);
    return dashboardStatsSchema.parse(data);
  } catch {
    return MOCK_DASHBOARD_STATS;
  }
}
