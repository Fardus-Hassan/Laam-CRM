import { Suspense } from 'react';

import { ReportsShell } from '@/features/reports/components/reports-shell';
import { Skeleton } from '@/components/ui/skeleton';

type ReportsPageProps = {
  searchParams?: Promise<{ view?: string; period?: string }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ReportsShell initialView={params?.view} initialPeriod={params?.period} />
    </Suspense>
  );
}
