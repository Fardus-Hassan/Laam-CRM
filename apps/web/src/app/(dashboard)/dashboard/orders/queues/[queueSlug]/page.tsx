import { Suspense } from 'react';

import { OrderQueueListPage } from '@/features/orders/components/order-queue-list-page';
import { Skeleton } from '@/components/ui/skeleton';

type OrderQueuePageProps = {
  params: Promise<{ queueSlug: string }>;
};

function QueueFallback() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default async function OrderQueuePage({ params }: OrderQueuePageProps) {
  const { queueSlug } = await params;

  return (
    <Suspense fallback={<QueueFallback />}>
      <OrderQueueListPage queueSlug={queueSlug} />
    </Suspense>
  );
}
