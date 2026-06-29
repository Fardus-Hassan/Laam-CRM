'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { LeadDetailView } from '@/features/leads/components/lead-detail-view';
import { useLeadDetail } from '@/features/leads/hooks/use-lead-detail';

type LeadDetailPageClientProps = {
  leadNumber: string;
};

export function LeadDetailPageClient({ leadNumber }: LeadDetailPageClientProps) {
  const { data, isLoading, error } = useLeadDetail(leadNumber);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="p-4 text-sm text-destructive">{error ?? 'Lead not found.'}</p>;
  }

  return <LeadDetailView lead={data} />;
}
