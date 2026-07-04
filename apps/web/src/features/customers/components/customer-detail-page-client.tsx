'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { CustomerDetailView } from '@/features/customers/components/customer-detail-view';
import { useCustomerDetail } from '@/features/customers/hooks/use-customer-detail';

export function CustomerDetailPageClient({ customerId }: { customerId: string }) {
  const { data, isLoading, error, refresh } = useCustomerDetail(customerId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="p-4 text-sm text-destructive">{error ?? 'Customer not found.'}</p>;
  }

  return (
    <CustomerDetailView
      customer={data}
      onCustomerUpdated={() => {
        void refresh();
      }}
    />
  );
}
