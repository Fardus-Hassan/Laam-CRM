'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { DealDetailView } from '@/features/deals/components/deal-detail-view';
import { useDealDetail } from '@/features/deals/hooks/use-deal-detail';

export function DealDetailPageClient({ dealId }: { dealId: string }) {
  const { data, isLoading, error } = useDealDetail(dealId);
  if (isLoading) return <Skeleton className="m-4 h-64 w-full" />;
  if (error || !data) return <p className="p-4 text-sm text-destructive">{error ?? 'Deal not found.'}</p>;
  return <DealDetailView deal={data} />;
}
