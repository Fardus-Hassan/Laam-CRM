import { Suspense } from 'react';
import { CompaniesListPage } from '@/features/companies/components/companies-list-page';
import { Skeleton } from '@/components/ui/skeleton';

type CompaniesPageProps = {
  searchParams?: Promise<{ status?: string; search?: string }>;
};

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  return (
    <Suspense fallback={<Skeleton className="m-4 h-64 w-full" />}>
      <CompaniesListPage status={params?.status} />
    </Suspense>
  );
}
