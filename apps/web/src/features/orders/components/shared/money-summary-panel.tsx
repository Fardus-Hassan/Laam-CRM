'use client';

import type { OrderDetail } from '@laam/types';

import { CreateOrderSummaryPanel } from '@/features/orders/components/create-order/create-order-summary-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { calcOrderPaymentTotals } from '@/features/orders/lib/order-payment-totals';

type MoneySummaryPanelProps =
  | {
      mode: 'create';
      form: CreateOrderFormApi;
      onSubmit: () => void;
      className?: string;
      showActions?: boolean;
    }
  | {
      mode: 'readonly';
      order: OrderDetail;
      className?: string;
    };

export function MoneySummaryPanel(props: MoneySummaryPanelProps) {
  if (props.mode === 'create') {
    return (
      <CreateOrderSummaryPanel
        form={props.form}
        onSubmit={props.onSubmit}
        className={props.className}
        showActions={props.showActions}
      />
    );
  }

  const { order, className } = props;
  const { paid, due } = calcOrderPaymentTotals(order);

  return (
    <Card className={cn('gap-0 py-0 shadow-none', className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Payment summary</CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-2 text-sm', ORDER_SECTION_BODY_CLASS)}>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Delivery</span>
          <span className="tabular-nums">{formatCurrency(order.deliveryCharge)}</span>
        </div>
        {order.discount ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="tabular-nums">-{formatCurrency(order.discount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatCurrency(order.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid</span>
          <span className="tabular-nums text-primary">{formatCurrency(paid)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Due</span>
          <span className={cn('tabular-nums', due > 0 && 'text-destructive')}>
            {formatCurrency(due)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{order.paymentStatus.toUpperCase()}</p>
      </CardContent>
    </Card>
  );
}
