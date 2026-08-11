'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { OrderListShell } from '@/features/orders/components/order-list/order-list-shell';
import { resolveOrderQueueFromPath } from '@/features/orders/config/order-queue-resolver';
import { ORDER_STATUSES_CHANGED } from '@/features/orders/data/order-status-store';
import { useOrderStatusConfig } from '@/features/orders/hooks/use-order-status-config';

type OrderQueueListPageProps = {
  queueSlug: string;
};

/**
 * Resolves queue context on the client so nested tabs follow local status
 * overrides (SSR cannot read localStorage).
 */
export function OrderQueueListPage({ queueSlug }: OrderQueueListPageProps) {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? undefined;
  const [version, setVersion] = React.useState(0);
  useOrderStatusConfig();

  React.useEffect(() => {
    function refresh() {
      setVersion((current) => current + 1);
    }
    window.addEventListener(ORDER_STATUSES_CHANGED, refresh);
    return () => window.removeEventListener(ORDER_STATUSES_CHANGED, refresh);
  }, []);

  void version;
  const queue = resolveOrderQueueFromPath(
    `/dashboard/orders/queues/${queueSlug}`,
    status,
    queueSlug,
  );

  return <OrderListShell queue={queue} />;
}
