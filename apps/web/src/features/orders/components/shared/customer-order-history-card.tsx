'use client';

import * as React from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';

import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { ordersApi } from '@/features/orders/api/orders-api';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type CustomerOrderHistoryCardProps = {
  phone: string;
  currentOrderId: string;
  className?: string;
};

export function CustomerOrderHistoryCard({
  phone,
  currentOrderId,
  className,
}: CustomerOrderHistoryCardProps) {
  const [orders, setOrders] = React.useState<
    Awaited<ReturnType<typeof ordersApi.getOrdersByPhone>>
  >([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void ordersApi.getOrdersByPhone(phone, currentOrderId).then((items) => {
      if (!cancelled) {
        setOrders(items);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [phone, currentOrderId]);

  const completed = orders.filter((o) =>
    ['delivered', 'completed'].includes(o.status),
  ).length;
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;
  const totalSpent = orders.reduce((sum, o) => sum + o.amount, 0);

  return (
    <Card className={cn('gap-0 py-0 shadow-none', className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="size-4 text-primary" />
          Customer history
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-muted/60" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="font-semibold tabular-nums">{orders.length}</p>
                <p className="text-muted-foreground">Orders</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="font-semibold tabular-nums text-primary">{completed}</p>
                <p className="text-muted-foreground">Delivered</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="font-semibold tabular-nums">{formatCurrency(totalSpent)}</p>
                <p className="text-muted-foreground">Lifetime</p>
              </div>
            </div>
            {cancelled > 0 ? (
              <p className="text-xs text-muted-foreground">
                {cancelled} cancelled order{cancelled === 1 ? '' : 's'} on this phone
              </p>
            ) : null}
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">First order from this customer.</p>
            ) : (
              <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                {orders.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/dashboard/orders/${item.orderNumber}`}
                      className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/40"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <StatusBadge status={item.status} kind="order" />
                        <span className="truncate font-medium">{item.orderNumber}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatCurrency(item.amount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
