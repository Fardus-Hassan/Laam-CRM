import { Suspense } from 'react';

import { CustomersListPage } from '@/features/customers/components/customers-list-page';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomersPage() {
  return (
    <Suspense fallback={<Skeleton className="m-4 h-64 w-full" />}>
      <CustomersListPage />
    </Suspense>
  );
}
