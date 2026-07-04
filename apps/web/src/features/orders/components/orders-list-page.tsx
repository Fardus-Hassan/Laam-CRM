'use client';

import { usePathname } from 'next/navigation';

import { OrderListShell } from '@/features/orders/components/order-list/order-list-shell';
import { resolveOrderQueueFromPath } from '@/features/orders/config/order-queue-resolver';

type OrdersListPageProps = {
  status?: string;
};

export function OrdersListPage({ status }: OrdersListPageProps) {
  const pathname = usePathname();
  const queue = resolveOrderQueueFromPath(pathname, status);

  return <OrderListShell queue={queue} />;
}
