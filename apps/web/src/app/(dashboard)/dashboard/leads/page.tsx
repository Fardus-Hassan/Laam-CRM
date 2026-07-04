import { Suspense } from 'react';

import { LeadsListPage } from '@/features/leads/components/leads-list-page';
import { Skeleton } from '@/components/ui/skeleton';

type LeadsPageProps = {
  searchParams?: Promise<{ status?: string; source?: string; search?: string }>;
};

function LeadsListFallback() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <Suspense fallback={<LeadsListFallback />}>
      <LeadsListPage status={params?.status} source={params?.source} />
    </Suspense>
  );
}
