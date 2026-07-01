import { Suspense } from 'react';

import { BulkPrintPage } from '@/features/orders/components/tools/bulk-print-page';
import { Skeleton } from '@/components/ui/skeleton';

export default function BulkPrintRoute() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <BulkPrintPage />
    </Suspense>
  );
}
