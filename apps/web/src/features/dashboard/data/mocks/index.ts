import type { DashboardResponse } from '@laam/types';
import { MOCK_AGENT_DASHBOARD } from '@/features/dashboard/data/mocks/agent.mock';
import { MOCK_CEO_DASHBOARD } from '@/features/dashboard/data/mocks/ceo.mock';
import { MOCK_TEAM_LEADER_DASHBOARD } from '@/features/dashboard/data/mocks/team-leader.mock';
import { MOCK_SUPER_ADMIN_DASHBOARD } from '@/features/dashboard/data/mocks/super-admin.mock';
import { MOCK_MARKETING_HEAD_DASHBOARD } from '@/features/dashboard/data/mocks/marketing-head.mock';
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
  if (role === 'sales_manager' || role === 'org_admin') {
    return {
      kind: 'sales_head',
      data: { ...MOCK_SALES_HEAD_DASHBOARD, role: role as typeof MOCK_SALES_HEAD_DASHBOARD.role },
    };
  }

  if (role === 'super_admin') {
    return {
      kind: 'super_admin',
      data: { ...MOCK_SUPER_ADMIN_DASHBOARD, role: 'super_admin' },
    };
  }

  if (role === 'sales_rep') {
    return {
      kind: 'agent',
      data: { ...MOCK_AGENT_DASHBOARD, role: 'sales_rep' },
    };
  }

  if (role === 'marketing_head') {
    return {
      kind: 'marketing_head',
      data: { ...MOCK_MARKETING_HEAD_DASHBOARD, role: 'marketing_head' },
    };
  }

  if (role === 'ceo') {
    return {
      kind: 'ceo',
      data: { ...MOCK_CEO_DASHBOARD, role: 'ceo' },
    };
  }

  if (role === 'team_leader') {
    return {
      kind: 'team_leader',
      data: { ...MOCK_TEAM_LEADER_DASHBOARD, role: 'team_leader' },
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
