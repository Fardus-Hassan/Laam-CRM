'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { VALID_COUPON_CODE } from '@/features/orders/data/mock-create-order';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { FieldTooltip } from './field-tooltip';
import { DiscountToggle } from './discount-toggle';
import { MoneyInput } from './money-input';
import { OrderDatePicker } from './order-date-picker';

type CreateOrderSummaryPanelProps = {
  form: CreateOrderFormApi;
  onSubmit: () => void;
  className?: string;
  showActions?: boolean;
};

function ReadOnlyAmount({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{formatCurrency(value)}</span>
    </div>
  );
}

export function CreateOrderSummaryPanel({
  form,
  onSubmit,
  className,
  showActions = true,
}: CreateOrderSummaryPanelProps) {
  const { state, totals, errors, patch, applyCoupon } = form;
  const [couponOpen, setCouponOpen] = React.useState(false);

  return (
    <Card className={cn('gap-0 py-0 shadow-none', className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Summary</CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
        <OrderDatePicker
          value={state.orderDate}
          onChange={(orderDate) => patch({ orderDate })}
          error={errors.orderDate}
        />

        <FormField label="Reference No" htmlFor="referenceNo">
          <FormInput
            id="referenceNo"
            value={state.referenceNo}
            onChange={(event) => patch({ referenceNo: event.target.value })}
            placeholder="Optional reference"
          />
        </FormField>

        <div className="space-y-3 rounded-lg bg-muted/30 p-3">
          <ReadOnlyAmount label="Subtotal (Tk)" value={totals.subtotal} />

          <FormField label="Discount/Less" required>
            <div className="space-y-2">
              <div className="flex justify-end">
                <DiscountToggle
                  mode={state.discountMode}
                  onChange={(discountMode) => patch({ discountMode })}
                />
              </div>
              <MoneyInput
                value={state.discountValue}
                onChange={(discountValue) => patch({ discountValue })}
              />
            </div>
          </FormField>

          <ReadOnlyAmount label="After Discount (Tk)" value={totals.afterDiscount} />

          <FormField
            label="Shipping (Tk)"
            required
            hint="Delivery charge added to the customer's payable total."
          >
            <div className="flex items-center gap-1">
              <MoneyInput
                value={state.shipping}
                onChange={(shipping) => patch({ shipping })}
                className="flex-1"
              />
              <FieldTooltip content="Delivery charge added to the customer's payable total." />
            </div>
          </FormField>

          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2 text-sm font-semibold">
            <span>Grand Total (Tk)</span>
            <span className="tabular-nums">{formatCurrency(totals.grandTotal)}</span>
          </div>

          <FormField label="Advance Payment">
            <MoneyInput
              value={state.advancePayment}
              onChange={(advancePayment) => patch({ advancePayment })}
            />
          </FormField>

          <ReadOnlyAmount label="Due (Tk)" value={totals.due} />

          <FormField label="Courier Charged to me">
            <div className="flex items-center gap-1">
              <MoneyInput
                value={state.courierChargedToMe}
                onChange={(courierChargedToMe) => patch({ courierChargedToMe })}
                className="flex-1"
              />
              <FieldTooltip content="Courier fee absorbed by the merchant (internal tracking)." />
            </div>
          </FormField>
        </div>

        <div className="space-y-2">
          {!couponOpen && !state.couponApplied ? (
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => setCouponOpen(true)}
            >
              Apply Coupon
            </button>
          ) : (
            <div className="space-y-2 rounded-md border border-border/70 p-3">
              <FormField label="Coupon code" htmlFor="couponCode">
                <div className="flex gap-2">
                  <FormInput
                    id="couponCode"
                    value={state.couponCode}
                    onChange={(event) =>
                      patch({ couponCode: event.target.value, couponApplied: false })
                    }
                    placeholder={`Try ${VALID_COUPON_CODE}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      const applied = applyCoupon();
                      if (applied) {
                        toast.success('Coupon applied — 10% off');
                      } else {
                        toast.error(`Invalid coupon. Try ${VALID_COUPON_CODE}`);
                      }
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </FormField>
              {state.couponApplied ? (
                <p className="text-xs text-primary">Coupon applied — 10% off</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            id="skipFollowup"
            type="checkbox"
            checked={state.skipFollowup}
            onChange={(event) => patch({ skipFollowup: event.target.checked })}
            className="size-4 rounded border border-input"
          />
          <Label htmlFor="skipFollowup">Skip Followup</Label>
        </div>

        {showActions ? (
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={onSubmit}>
              Submit
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/orders">Cancel</Link>
            </Button>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">NB: * marked are required field.</p>
      </CardContent>
    </Card>
  );
}
