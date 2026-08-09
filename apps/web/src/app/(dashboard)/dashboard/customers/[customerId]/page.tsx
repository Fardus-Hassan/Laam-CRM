import { CustomerDetailPageClient } from '@/features/customers/components/customer-detail-page-client';

type CustomerDetailPageProps = {
  params: Promise<{ customerId: string }>;
};

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { customerId } = await params;
  return <CustomerDetailPageClient customerId={customerId} />;
}
