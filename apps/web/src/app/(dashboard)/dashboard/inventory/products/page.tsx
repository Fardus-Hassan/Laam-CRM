import { Suspense } from 'react';

import { ProductsListPage } from '@/features/inventory/components/products-list-page';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ProductsListPage />
    </Suspense>
  );
}
