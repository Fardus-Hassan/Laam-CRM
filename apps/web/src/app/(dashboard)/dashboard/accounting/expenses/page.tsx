import { Suspense } from 'react';

import { ExpenseListPage } from '@/features/accounting/components/accounting-pages';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <ExpenseListPage />
    </Suspense>
  );
}
