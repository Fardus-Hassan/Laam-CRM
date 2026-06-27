import type { DashboardResponse, UserRole } from '@laam/types';
import { dashboardResponseSchema } from '@laam/types';

import { apiRequest } from '@/lib/api/client';
import { crmEndpoints } from '@/lib/api/endpoints';
import { getMockDashboardForRole } from '@/features/dashboard/data/mocks';
import { applyDateRangeToSalesHead } from '@/features/dashboard/lib/apply-date-range';

export type DashboardQuery = {
  from: string;
  to: string;
};

function buildDashboardUrl(role: UserRole, query?: DashboardQuery): string {
  const params = new URLSearchParams({ role });
  if (query) {
    params.set('from', query.from);
    params.set('to', query.to);
  }
  return `${crmEndpoints.dashboard}?${params.toString()}`;
}

function applyMockDateRange(
  response: DashboardResponse,
  query?: DashboardQuery,
): DashboardResponse {
  if (!query || response.kind !== 'sales_head') {
    return response;
  }

  return {
    kind: 'sales_head',
    data: applyDateRangeToSalesHead(
      response.data,
      new Date(query.from),
      new Date(query.to),
    ),
  };
}

/**
 * Fetches role-scoped dashboard payload.
 * API contract: GET /crm/dashboard?role={role}&from={iso}&to={iso} → DashboardResponse
 */
export async function fetchDashboard(
  role: UserRole,
  query?: DashboardQuery,
): Promise<DashboardResponse> {
  try {
    const data = await apiRequest<unknown>(buildDashboardUrl(role, query));
    return dashboardResponseSchema.parse(data);
  } catch {
    return applyMockDateRange(getMockDashboardForRole(role), query);
  }
}

/** @deprecated Use fetchDashboard(role) — kept for backward compatibility. */
export async function fetchDashboardStats() {
  const dashboard = await fetchDashboard('org_admin');
  if (dashboard.kind === 'default') {
    return {
      pipelineValue: String(dashboard.data.kpis[0]?.value ?? '—'),
      openDeals: Number(dashboard.data.kpis[1]?.value ?? 0),
      newLeads: Number(dashboard.data.kpis[2]?.value ?? 0),
    };
  }

  return {
    pipelineValue: '৳ 12.4L',
    openDeals: 28,
    newLeads: 14,
  };
}
