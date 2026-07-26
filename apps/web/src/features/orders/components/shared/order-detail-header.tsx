'use client';

import type { OrderDetail } from '@laam/types';
import { CalendarClock, Copy, MessageCircle, Phone, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/dashboard/status-badge';
import { Badge } from '@/components/ui/badge';
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

function formatOrderDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function OrderDetailHeader({ order, className }: OrderDetailHeaderProps) {
  const { paid, due } = calcOrderPaymentTotals(order);
  const phoneDigits = order.customerPhone.replace(/\D/g, '');
  const paidRatio =
    order.amount > 0 ? Math.min(100, Math.round((paid / order.amount) * 100)) : 0;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm',
        className,
      )}
    >
      <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.06] via-background to-muted/30 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{order.orderNumber}</h2>
              <StatusBadge status={order.status} kind="order" />
              <OrderAgeBadge createdAt={order.createdAt} status={order.status} />
              {order.orderTag ? (
                <Badge variant="outline" className="rounded-md font-normal">
                  {order.orderTag}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <UserRound className="size-3.5" />
                {order.customerName}
              </span>
              <span className="hidden h-3 w-px bg-border sm:block" />
              <span>{ORDER_SOURCE_LABELS[order.source]}</span>
              <span className="hidden h-3 w-px bg-border sm:block" />
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                {formatOrderDate(order.createdAt)}
              </span>
              {order.assignedAgentName ? (
                <>
                  <span className="hidden h-3 w-px bg-border sm:block" />
                  <span>Agent: {order.assignedAgentName}</span>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 bg-background/80"
                onClick={() => {
                  void navigator.clipboard.writeText(order.customerPhone);
                  toast.success('Phone copied');
                }}
              >
                <Copy className="size-3.5" />
                {order.customerPhone}
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-8 bg-background/80" asChild>
                <a href={`tel:${phoneDigits}`}>
                  <Phone className="size-3.5" />
                  Call
                </a>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 bg-background/80"
                onClick={() => {
                  window.open(`https://wa.me/${phoneDigits}`, '_blank', 'noopener,noreferrer');
                }}
              >
                <MessageCircle className="size-3.5" />
                WhatsApp
              </Button>
            </div>
          </div>

          <div className="w-full shrink-0 rounded-xl border border-border/70 bg-background/90 p-3 sm:max-w-sm sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                <p className="text-[11px] text-muted-foreground">Total</p>
                <p className="font-semibold tabular-nums">{formatCurrency(order.amount)}</p>
              </div>
              <div className="rounded-lg bg-primary/5 px-2.5 py-2">
                <p className="text-[11px] text-muted-foreground">Paid</p>
                <p className="font-semibold tabular-nums text-primary">{formatCurrency(paid)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                <p className="text-[11px] text-muted-foreground">Due</p>
                <p
                  className={cn(
                    'font-semibold tabular-nums',
                    due > 0 ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  {formatCurrency(due)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  paidRatio >= 100 ? 'bg-primary' : 'bg-primary/70',
                )}
                style={{ width: `${paidRatio}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {paidRatio}% collected
              {order.paymentMethod ? ` · ${order.paymentMethod}` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
