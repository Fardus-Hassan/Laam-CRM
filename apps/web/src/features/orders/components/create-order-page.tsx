'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { PageShell } from '@/components/layout/page-shell';
import { VALID_COUPON_CODE } from '@/features/orders/data/mock-create-order';
import {
  clearLeadConvertPrefill,
  loadLeadConvertPrefill,
  markLeadConverted,
} from '@/features/leads/data/mock-leads';
import { mapLeadPrefillToOrderLineItems } from '@/features/leads/lib/lead-order-prefill';
import { CreateOrderOtherSection } from '@/features/orders/components/create-order/create-order-other-section';
import { CreateOrderStepIndicator } from '@/features/orders/components/create-order/create-order-step-indicator';
import { CustomerBlock } from '@/features/orders/components/shared/customer-block';
import { MoneySummaryPanel } from '@/features/orders/components/shared/money-summary-panel';
import { ProductPicker } from '@/features/orders/components/shared/product-picker';
import {
  ORDER_PAGE_GAP,
  ORDER_SIDEBAR_GRID_CLASS,
  ORDER_STICKY_MAX_H_CLASS,
  ORDER_STICKY_TOP_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { useCreateOrderForm } from '@/features/orders/hooks/use-create-order-form';
import { useOrderMutations } from '@/features/orders/hooks/use-order-mutations';
import { createOrderCreateBreadcrumbs } from '@/features/orders/lib/order-breadcrumbs';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function CreateOrderPage() {
  const router = useRouter();
  const form = useCreateOrderForm();
  const { createOrder, checkDuplicate, isLoading } = useOrderMutations();
  const [duplicate, setDuplicate] = React.useState<{
    orderNumber: string;
    orderId: string;
  } | null>(null);
  const [leadPrefillId, setLeadPrefillId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const prefill = loadLeadConvertPrefill();
    if (!prefill) return;

    form.patch({
      name: prefill.customerName,
      mobile: prefill.customerPhone,
      email: prefill.customerEmail ?? '',
      address: prefill.shippingAddress ?? '',
      district: prefill.shippingArea ?? '',
      orderSource: prefill.orderSource,
      ...(prefill.lineItems?.length
        ? { lineItems: mapLeadPrefillToOrderLineItems(prefill.lineItems) }
        : {}),
    });
    setLeadPrefillId(prefill.leadId);
    clearLeadConvertPrefill();
    toast.info(`Pre-filled from lead ${prefill.leadNumber}`);
    // Run once on mount when converting from a lead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMobileCheck() {
    form.lookupCustomer();
    if (!form.state.mobile.trim()) return;
    const result = await checkDuplicate(form.state.mobile);
    if (result.isDuplicate && result.existingOrderNumber && result.existingOrderId) {
      setDuplicate({
        orderNumber: result.existingOrderNumber,
        orderId: result.existingOrderId,
      });
    } else {
      setDuplicate(null);
    }
  }

  async function handleSubmit() {
    if (!form.validate()) {
      toast.error('Please fill all required fields');
      return;
    }

    if (form.state.couponCode && !form.state.couponApplied) {
      toast.error(`Invalid coupon. Try ${VALID_COUPON_CODE}`);
      return;
    }

    const lineItems = form.state.lineItems.map((line) => ({
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    }));

    const order = await createOrder({
      customerName: form.state.name,
      customerPhone: form.state.mobile,
      customerEmail: form.state.email || undefined,
      shippingAddress: form.state.address,
      shippingArea: form.state.district || 'Dhaka',
      district: form.state.district,
      source: (form.state.orderSource || 'call') as 'facebook' | 'call' | 'ecommerce' | 'walk_in',
      status: (form.state.orderStatus || 'pending') as 'pending',
      paymentStatus:
        form.state.paymentMethod === 'paid'
          ? 'paid'
          : form.state.advancePayment > 0
            ? 'partial'
            : 'cod',
      paidAmount:
        form.state.advancePayment > 0 ? form.state.advancePayment : undefined,
      deliveryCharge: form.state.shipping,
      discount: form.totals.orderDiscount + form.totals.couponDiscount,
      lineItems,
      notes: form.state.orderNote || undefined,
      skipFollowup: form.state.skipFollowup,
      couponCode: form.state.couponApplied ? form.state.couponCode : undefined,
      leadId: leadPrefillId ?? undefined,
    });

    if (leadPrefillId) {
      markLeadConverted(leadPrefillId, order.orderNumber);
    }

    router.push(`/dashboard/orders/${order.orderNumber}`);
  }

  return (
    <PageShell
      title="Create New Order"
      description="Manually enter customer, products, and payment details."
      breadcrumbs={createOrderCreateBreadcrumbs()}
    >
      <div className={cn(ORDER_PAGE_GAP)}>
        <CreateOrderStepIndicator />

        {duplicate ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-foreground">Possible duplicate order</p>
              <p className="text-muted-foreground">
                Similar order exists:{' '}
                <Link
                  href={`/dashboard/orders/${duplicate.orderNumber}`}
                  className="font-medium text-primary underline"
                >
                  {duplicate.orderNumber}
                </Link>
              </p>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
          className={cn('grid gap-4', ORDER_SIDEBAR_GRID_CLASS)}
        >
          <div className="space-y-4 pb-24 xl:pb-0">
            <div id="create-order-customer" onBlur={handleMobileCheck} className="scroll-mt-24">
              <CustomerBlock mode="create" form={form} />
            </div>
            <div id="create-order-products" className="scroll-mt-24">
              <ProductPicker mode="create" form={form} />
            </div>
            <div id="create-order-payment" className="scroll-mt-24">
              <CreateOrderOtherSection form={form} />
            </div>
          </div>

          <div className="hidden xl:block">
            <div
              className={cn(
                'custom-scrollbar sticky z-30 overflow-y-auto',
                ORDER_STICKY_TOP_CLASS,
                ORDER_STICKY_MAX_H_CLASS,
              )}
            >
              <MoneySummaryPanel
                mode="create"
                form={form}
                onSubmit={() => void handleSubmit()}
              />
            </div>
          </div>

          <div className="xl:hidden">
            <MoneySummaryPanel
              mode="create"
              form={form}
              onSubmit={() => void handleSubmit()}
              showActions={false}
            />
          </div>
        </form>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/80 xl:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Grand Total</p>
            <p className="truncate text-base font-semibold tabular-nums">
              {formatCurrency(form.totals.grandTotal)}
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0"
            disabled={isLoading}
            onClick={() => void handleSubmit()}
          >
            Submit
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
