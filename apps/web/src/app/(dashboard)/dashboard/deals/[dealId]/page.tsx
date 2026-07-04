import { DealDetailPageClient } from '@/features/deals/components/deal-detail-page-client';

type DealDetailPageProps = {
  params: Promise<{ dealId: string }>;
};

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const { dealId } = await params;
  return <DealDetailPageClient dealId={dealId} />;
}
