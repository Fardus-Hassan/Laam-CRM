import { OrderDetailPageClient } from '@/features/orders/components/order-detail-page-client';

type OrderDetailPageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = await params;

  return <OrderDetailPageClient orderNumber={orderId} />;
}
