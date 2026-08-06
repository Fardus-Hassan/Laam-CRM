'use client';

import type { OrderDetail } from '@laam/types';
import { CalendarClock, Copy, MessageCircle, Phone, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/dashboard/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OrderAgeBadge } from '@/features/orders/components/shared/order-age-badge';
import {
  ORDER_SECTION_BODY_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { calcOrderPaymentTotals } from '@/features/orders/lib/order-payment-totals';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type OrderDetailSidebarMetaProps = {
  order: OrderDetail;
  className?: string;
};

type OrderPaymentStripProps = {
  order: OrderDetail;
  className?: string;
};

function formatOrderDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Compact order identity for the detail sidebar (replaces the old full-width header). */
export function OrderDetailSidebarMeta({ order, className }: OrderDetailSidebarMetaProps) {
  const phoneDigits = order.customerPhone.replace(/\D/g, '');

  return (
    <Card className={cn('w-full gap-0 overflow-hidden py-0 shadow-none', className)}>
      <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-base font-semibold tracking-tight">{order.orderNumber}</h2>
            <StatusBadge status={order.status} kind="order" />
            <OrderAgeBadge createdAt={order.createdAt} status={order.status} />
            {order.orderTag ? (
              <Badge variant="outline" className="rounded-md font-normal">
                {order.orderTag}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <UserRound className="size-3.5 shrink-0" />
              <span className="truncate">{order.customerName}</span>
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-5">
              <span>{ORDER_SOURCE_LABELS[order.source]}</span>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3" />
                {formatOrderDate(order.createdAt)}
              </span>
            </p>
            {order.assignedAgentName ? (
              <p className="pl-5">Agent: {order.assignedAgentName}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 max-w-full px-2 text-xs"
            onClick={() => {
              void navigator.clipboard.writeText(order.customerPhone);
              toast.success('Phone copied');
            }}
          >
            <Copy className="size-3" />
            <span className="truncate">{order.customerPhone}</span>
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
            <a href={`tel:${phoneDigits}`}>
              <Phone className="size-3" />
              Call
            </a>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => {
              window.open(`https://wa.me/${phoneDigits}`, '_blank', 'noopener,noreferrer');
            }}
          >
            <MessageCircle className="size-3" />
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Compact payment snapshot — sits under money totals in the sidebar. */
export function OrderPaymentStrip({ order, className }: OrderPaymentStripProps) {
  const { paid, due } = calcOrderPaymentTotals(order);
  const paidRatio =
    order.amount > 0 ? Math.min(100, Math.round((paid / order.amount) * 100)) : 0;

  return (
    <div className={cn('space-y-2 rounded-lg border border-border/70 bg-muted/20 p-2.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Payment
        </p>
        <Badge
          variant={
            order.paymentStatus === 'paid'
              ? 'success'
              : order.paymentStatus === 'partial'
                ? 'warning'
                : 'outline'
          }
          className="rounded-md uppercase"
        >
          {order.paymentStatus}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-sm">
        <div className="rounded-md bg-background/80 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">Total</p>
          <p className="text-xs font-semibold tabular-nums">{formatCurrency(order.amount)}</p>
        </div>
        <div className="rounded-md bg-primary/5 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">Paid</p>
          <p className="text-xs font-semibold tabular-nums text-primary">{formatCurrency(paid)}</p>
        </div>
        <div className="rounded-md bg-background/80 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">Due</p>
          <p
            className={cn(
              'text-xs font-semibold tabular-nums',
              due > 0 ? 'text-destructive' : 'text-foreground',
            )}
          >
            {formatCurrency(due)}
          </p>
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            paidRatio >= 100 ? 'bg-primary' : 'bg-primary/70',
          )}
          style={{ width: `${paidRatio}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {paidRatio}% collected
        {order.paymentMethod ? ` · ${order.paymentMethod}` : ''}
      </p>
    </div>
  );
}

/** @deprecated Use OrderDetailSidebarMeta — kept as alias for older imports. */
export function OrderDetailHeader(props: OrderDetailSidebarMetaProps) {
  return <OrderDetailSidebarMeta {...props} />;
}
