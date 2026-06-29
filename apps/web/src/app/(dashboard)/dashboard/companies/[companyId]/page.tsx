import { CompanyDetailPageClient } from '@/features/companies/components/company-detail-page-client';

type CompanyDetailPageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { companyId } = await params;
  return <CompanyDetailPageClient companyId={companyId} />;
}
