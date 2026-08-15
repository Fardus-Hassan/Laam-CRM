'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { OrderListShell } from '@/features/orders/components/order-list/order-list-shell';
import { resolveOrderQueueFromPath } from '@/features/orders/config/order-queue-resolver';
import { ORDER_STATUSES_CHANGED } from '@/features/orders/data/order-status-store';
import { useOrderStatusConfig } from '@/features/orders/hooks/use-order-status-config';

export function OrdersListPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? undefined;
  const [version, setVersion] = React.useState(0);
  // Ensure org status/queue config hydrates on this route (not only via sidebar).
  useOrderStatusConfig();

  React.useEffect(() => {
    function refresh() {
      setVersion((current) => current + 1);
    }
    window.addEventListener(ORDER_STATUSES_CHANGED, refresh);
    return () => window.removeEventListener(ORDER_STATUSES_CHANGED, refresh);
  }, []);

  void version;
  const queue = resolveOrderQueueFromPath(pathname, status);

  return <OrderListShell queue={queue} />;
}
