import { CustomerDetailPageClient } from '@/features/customers/components/customer-detail-page-client';

type CompanyDetailPageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { companyId } = await params;
  return <CustomerDetailPageClient customerId={companyId} />;
}
