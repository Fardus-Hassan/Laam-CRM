import { Suspense } from 'react';

import { OrderListShell } from '@/features/orders/components/order-list/order-list-shell';
import { resolveOrderQueueFromPath } from '@/features/orders/config/order-queue-resolver';
import { Skeleton } from '@/components/ui/skeleton';

type OrderQueuePageProps = {
  params: Promise<{ queueSlug: string }>;
  searchParams?: Promise<{ status?: string }>;
};

function QueueFallback() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default async function OrderQueuePage({ params, searchParams }: OrderQueuePageProps) {
  const { queueSlug } = await params;
  const query = searchParams ? await searchParams : undefined;
  const queue = resolveOrderQueueFromPath(
    `/dashboard/orders/queues/${queueSlug}`,
    query?.status,
    queueSlug,
  );

  return (
    <Suspense fallback={<QueueFallback />}>
      <OrderListShell queue={queue} />
    </Suspense>
  );
}
