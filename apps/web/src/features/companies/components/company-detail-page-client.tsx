'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { CompanyDetailView } from '@/features/companies/components/company-detail-view';
import { useCompanyDetail } from '@/features/companies/hooks/use-company-detail';

export function CompanyDetailPageClient({ companyId }: { companyId: string }) {
  const { data, isLoading, error } = useCompanyDetail(companyId);
  if (isLoading) return <Skeleton className="m-4 h-64 w-full" />;
  if (error || !data) return <p className="p-4 text-sm text-destructive">{error ?? 'Customer not found.'}</p>;
  return <CompanyDetailView company={data} />;
}
