'use client';

import * as React from 'react';
import type { OrderDetail } from '@laam/types';
import { Copy, MessageCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { OrderAgeBadge } from '@/features/orders/components/shared/order-age-badge';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { calcOrderPaymentTotals } from '@/features/orders/lib/order-payment-totals';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type OrderDetailHeaderProps = {
  order: OrderDetail;
  className?: string;
};

export function OrderDetailHeader({ order, className }: OrderDetailHeaderProps) {
  const { paid, due } = calcOrderPaymentTotals(order);
  const phoneDigits = order.customerPhone.replace(/\D/g, '');

  return (
    <div
      className={cn(
        'rounded-xl border bg-gradient-to-br from-muted/40 to-muted/10 p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{order.orderNumber}</h2>
            <StatusBadge status={order.status} kind="order" />
            <OrderAgeBadge createdAt={order.createdAt} status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {order.customerName} · {ORDER_SOURCE_LABELS[order.source]}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(order.customerPhone);
                toast.success('Phone copied');
              }}
            >
              <Copy className="size-3.5" />
              {order.customerPhone}
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <a href={`tel:${phoneDigits}`}>
                <Phone className="size-3.5" />
                Call
              </a>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                window.open(`https://wa.me/${phoneDigits}`, '_blank', 'noopener,noreferrer');
              }}
            >
              <MessageCircle className="size-3.5" />
              WhatsApp
            </Button>
          </div>
        </div>
        <div className="grid min-w-[200px] grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold tabular-nums">{formatCurrency(order.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="font-semibold tabular-nums text-primary">{formatCurrency(paid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due</p>
            <p className={cn('font-semibold tabular-nums', due > 0 && 'text-destructive')}>
              {formatCurrency(due)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
