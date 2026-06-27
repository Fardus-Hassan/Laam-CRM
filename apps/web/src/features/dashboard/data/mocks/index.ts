import type { DashboardResponse } from '@laam/types';
import { MOCK_AGENT_DASHBOARD } from '@/features/dashboard/data/mocks/agent.mock';
import { MOCK_SALES_HEAD_DASHBOARD } from '@/features/dashboard/data/mocks/sales-head.mock';

export const MOCK_DEFAULT_DASHBOARD: DashboardResponse = {
  kind: 'default',
  data: {
    role: 'viewer',
    title: 'Dashboard',
    subtitle: 'Overview of your CRM workspace',
    kpis: [
      { id: 'pipeline', label: 'Pipeline value', value: '৳ 12.4L' },
      { id: 'deals', label: 'Open deals', value: 28 },
      { id: 'leads', label: 'New leads', value: 14 },
    ],
  },
};

export function getMockDashboardForRole(role: string): DashboardResponse {
  if (role === 'sales_manager' || role === 'org_admin' || role === 'super_admin') {
    return {
      kind: 'sales_head',
      data: { ...MOCK_SALES_HEAD_DASHBOARD, role: role as typeof MOCK_SALES_HEAD_DASHBOARD.role },
    };
  }

  if (role === 'sales_rep') {
    return {
      kind: 'agent',
      data: { ...MOCK_AGENT_DASHBOARD, role: 'sales_rep' },
    };
  }

  return {
    kind: 'default',
    data: {
      ...MOCK_DEFAULT_DASHBOARD.data,
      role: role as typeof MOCK_DEFAULT_DASHBOARD.data.role,
    },
  };
}
