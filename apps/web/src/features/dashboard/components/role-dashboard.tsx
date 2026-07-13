'use client';

import * as React from 'react';
import type { DashboardResponse } from '@laam/types';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchDashboard } from '@/features/dashboard/api/dashboard-api';
import { useDashboardDate } from '@/features/dashboard/providers/dashboard-date-provider';
import { MarketingHeadDashboardView } from '@/features/dashboard/components/dashboards/marketing-head-dashboard';
import { CeoDashboardView } from '@/features/dashboard/components/dashboards/ceo-dashboard';
import { TeamLeaderDashboardView } from '@/features/dashboard/components/dashboards/team-leader-dashboard';
import { SuperAdminDashboardView } from '@/features/dashboard/components/dashboards/super-admin-dashboard';
import { AgentDashboardView } from '@/features/dashboard/components/dashboards/agent-dashboard';
import { DefaultDashboardView } from '@/features/dashboard/components/dashboards/default-dashboard';
import { SalesHeadDashboardView } from '@/features/dashboard/components/dashboards/sales-head-dashboard';
import {
  getDashboardRoleForTemplate,
  resolveDashboardTemplate,
} from '@/features/dashboard/config/dashboard-templates';

import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton';

type RoleDashboardProps = {
  initialData?: DashboardResponse;
};

export function RoleDashboard({ initialData }: RoleDashboardProps) {
  const { user, status } = useAuth();
  const { isoRange } = useDashboardDate();
  const [data, setData] = React.useState<DashboardResponse | null>(initialData ?? null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) {
      return;
    }

    const template = resolveDashboardTemplate(user);
    const dashboardRole = getDashboardRoleForTemplate(template);

    let cancelled = false;
    setLoadError(null);

    void fetchDashboard(dashboardRole, isoRange ?? undefined)
      .then((next) => {
        if (!cancelled) {
          setData(next);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load dashboard');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, isoRange?.from, isoRange?.to]);

  if (status === 'loading' || (status === 'authenticated' && !data && !loadError)) {
    return <DashboardSkeleton />;
  }

  if (loadError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {loadError}
      </p>
    );
  }

  if (!data) {
    return <DashboardSkeleton />;
  }

  if (data.kind === 'sales_head') {
    return <SalesHeadDashboardView data={data.data} />;
  }

  if (data.kind === 'agent') {
    return <AgentDashboardView data={data.data} />;
  }

  if (data.kind === 'marketing_head') {
    return <MarketingHeadDashboardView data={data.data} />;
  }

  if (data.kind === 'ceo') {
    return <CeoDashboardView data={data.data} />;
  }

  if (data.kind === 'team_leader') {
    return <TeamLeaderDashboardView data={data.data} />;
  }

  if (data.kind === 'super_admin') {
    return <SuperAdminDashboardView data={data.data} />;
  }

  return <DefaultDashboardView data={data.data} />;
}
