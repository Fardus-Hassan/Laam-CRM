'use client';

import * as React from 'react';
import type { OrderDetail } from '@laam/types';
import { Banknote } from 'lucide-react';
import { toast } from 'sonner';

import { CreateOrderSummaryPanel } from '@/features/orders/components/create-order/create-order-summary-panel';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';
import { orderPaymentsApi } from '@/features/orders/api/order-payments-api';
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
      onCollected?: () => void;
    };

function Row({
  label,
  value,
  muted,
  strong,
  danger,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 text-sm', strong && 'pt-1')}>
      <span className={cn(muted ? 'text-muted-foreground' : 'text-foreground')}>{label}</span>
      <span
        className={cn(
          'tabular-nums',
          strong && 'text-base font-semibold',
          danger && 'font-semibold text-destructive',
        )}
      >
        {value}
      </span>
    </div>
  );
}

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

  const { order, className, onCollected } = props;
  const { paid, due } = calcOrderPaymentTotals(order);
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(due > 0 ? String(due) : '');
  const [method, setMethod] = React.useState(order.paymentMethod || 'cod');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setAmount(due > 0 ? String(due) : '');
      setMethod(order.paymentMethod || 'cod');
    }
  }, [open, due, order.paymentMethod]);

  async function handleCollect() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await orderPaymentsApi.recordPayment(order.id, {
        amount: value,
        method,
      });
      toast.success('Payment recorded');
      setOpen(false);
      onCollected?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={cn('gap-0 overflow-hidden py-0 shadow-none', className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <Banknote className="size-4 text-primary" />
            Payment summary
          </span>
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
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-2.5', ORDER_SECTION_BODY_CLASS)}>
        <Row label="Subtotal" value={formatCurrency(order.subtotal)} muted />
        <Row label="Delivery" value={formatCurrency(order.deliveryCharge)} muted />
        {order.discount ? (
          <Row label="Discount" value={`−${formatCurrency(order.discount)}`} muted />
        ) : null}
        <div className="border-t border-border/70 pt-2.5">
          <Row label="Order total" value={formatCurrency(order.amount)} strong />
        </div>
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-2.5">
          <Row label="Paid" value={formatCurrency(paid)} />
          <Row label="Due" value={formatCurrency(due)} danger={due > 0} />
        </div>
        {(order.paymentMethod || order.couponCode) && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {order.paymentMethod ? (
              <Badge variant="secondary" className="rounded-md font-normal">
                {order.paymentMethod}
              </Badge>
            ) : null}
            {order.couponCode ? (
              <Badge variant="outline" className="rounded-md font-normal">
                Coupon {order.couponCode}
              </Badge>
            ) : null}
          </div>
        )}
        {due > 0 ? (
          <Button type="button" size="sm" className="w-full" onClick={() => setOpen(true)}>
            Collect payment
          </Button>
        ) : null}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect payment — {order.orderNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Amount" required>
              <FormInput
                type="number"
                min={0}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>
            <FormField label="Method">
              <FormSelect
                value={method}
                onChange={setMethod}
                options={[
                  { value: 'cod', label: 'COD' },
                  { value: 'bkash', label: 'bKash' },
                  { value: 'nagad', label: 'Nagad' },
                  { value: 'bank', label: 'Bank' },
                  { value: 'cash', label: 'Cash' },
                ]}
              />
            </FormField>
            <p className="text-xs text-muted-foreground">Due now: {formatCurrency(due)}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCollect()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
