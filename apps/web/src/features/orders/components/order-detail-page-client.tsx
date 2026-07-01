'use client';

import Link from 'next/link';

import { OrderDetailView } from '@/features/orders/components/order-detail-view';
import { useOrderDetail } from '@/features/orders/hooks/use-order-detail';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type OrderDetailPageClientProps = {
  orderNumber: string;
};

export function OrderDetailPageClient({ orderNumber }: OrderDetailPageClientProps) {
  const { data, isLoading, error } = useOrderDetail(orderNumber);

  if (isLoading) {
    return (
      <PageShell title="Order" description="Loading order details…">
        <div className="space-y-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell title="Order not found" description="This order could not be loaded.">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/dashboard/orders">Back to orders</Link>
        </Button>
      </PageShell>
    );
  }

  return <OrderDetailView initialOrder={data} />;
}
