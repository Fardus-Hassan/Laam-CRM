import { Suspense } from 'react';
import { DealsListPage } from '@/features/deals/components/deals-list-page';
import { Skeleton } from '@/components/ui/skeleton';

type DealsPageProps = {
  searchParams?: Promise<{ stage?: string; search?: string }>;
};

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  return (
    <Suspense fallback={<Skeleton className="m-4 h-64 w-full" />}>
      <DealsListPage stage={params?.stage} />
    </Suspense>
  );
}
