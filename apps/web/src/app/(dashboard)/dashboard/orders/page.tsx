import { Suspense } from 'react';

import { OrdersListPage } from '@/features/orders/components/orders-list-page';
import { Skeleton } from '@/components/ui/skeleton';

function OrdersListFallback() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default async function OrdersPage() {
  return (
    <Suspense fallback={<OrdersListFallback />}>
      <OrdersListPage />
    </Suspense>
  );
}
