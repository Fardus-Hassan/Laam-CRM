import { Suspense } from 'react';

import { LedgerListPage } from '@/features/accounting/components/accounting-pages';
import { Skeleton } from '@/components/ui/skeleton';

export default function LedgerPage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <LedgerListPage />
    </Suspense>
  );
}
