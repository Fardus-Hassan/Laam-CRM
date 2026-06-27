'use client';

import * as React from 'react';
import type { DashboardResponse } from '@laam/types';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchDashboard } from '@/features/dashboard/api/dashboard-api';
import { useDashboardDate } from '@/features/dashboard/providers/dashboard-date-provider';
import { DefaultDashboardView } from '@/features/dashboard/components/dashboards/default-dashboard';
import { SalesHeadDashboardView } from '@/features/dashboard/components/dashboards/sales-head-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

type RoleDashboardProps = {
  initialData: DashboardResponse;
};

export function RoleDashboard({ initialData }: RoleDashboardProps) {
  const { user, status } = useAuth();
  const { isoRange } = useDashboardDate();
  const [data, setData] = React.useState(initialData);

  React.useEffect(() => {
    if (!user?.role) {
      return;
    }

    let cancelled = false;

    void fetchDashboard(user.role, isoRange ?? undefined).then((next) => {
      if (!cancelled) {
        setData(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.role, isoRange?.from, isoRange?.to]);

  if (status === 'loading') {
    return <DashboardSkeleton />;
  }

  if (data.kind === 'sales_head') {
    return <SalesHeadDashboardView data={data.data} />;
  }

  return <DefaultDashboardView data={data.data} />;
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="min-h-[50vh] flex-1 rounded-xl" />
    </div>
  );
}
