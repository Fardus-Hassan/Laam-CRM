import { LeadDetailPageClient } from '@/features/leads/components/lead-detail-page-client';

type LeadDetailPageProps = {
  params: Promise<{ leadId: string }>;
};

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { leadId } = await params;

  return <LeadDetailPageClient leadNumber={leadId} />;
}
