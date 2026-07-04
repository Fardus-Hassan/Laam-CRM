import { Suspense } from 'react';

import { CreateOrderPage } from '@/features/orders/components/create-order-page';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewOrderPage() {
  return (
    <Suspense fallback={<Skeleton className="m-4 h-64 w-full" />}>
      <CreateOrderPage />
    </Suspense>
  );
}
