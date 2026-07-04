import { Suspense } from 'react';

import { IncomeListPage } from '@/features/accounting/components/accounting-pages';
import { Skeleton } from '@/components/ui/skeleton';

export default function IncomePage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <IncomeListPage />
    </Suspense>
  );
}
