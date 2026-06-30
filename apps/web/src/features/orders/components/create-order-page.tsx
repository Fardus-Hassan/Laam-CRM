'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { VALID_COUPON_CODE } from '@/features/orders/data/mock-create-order';
import { CreateOrderCustomerSection } from '@/features/orders/components/create-order/create-order-customer-section';
import { CreateOrderOtherSection } from '@/features/orders/components/create-order/create-order-other-section';
import { CreateOrderProductsSection } from '@/features/orders/components/create-order/create-order-products-section';
import { CreateOrderSummaryPanel } from '@/features/orders/components/create-order/create-order-summary-panel';
import {
  ORDER_STICKY_MAX_H_CLASS,
  ORDER_STICKY_TOP_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { useCreateOrderForm } from '@/features/orders/hooks/use-create-order-form';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export function CreateOrderPage() {
  const router = useRouter();
  const form = useCreateOrderForm();

  function handleSubmit() {
    if (!form.validate()) {
      toast.error('Please fill all required fields');
      return;
    }

    if (form.state.couponCode && !form.state.couponApplied) {
      toast.error(`Invalid coupon. Try ${VALID_COUPON_CODE}`);
      return;
    }

    toast.success('Order created successfully');
    router.push('/dashboard/orders?status=pending');
  }

  return (
    <PageShell
      title="Create New Order"
      description="Manually enter customer, products, and payment details."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-4 pb-24 xl:pb-0">
          <CreateOrderCustomerSection form={form} />
          <CreateOrderProductsSection form={form} />
          <CreateOrderOtherSection form={form} />
        </div>

        <div className="hidden xl:block">
          <div
            className={cn(
              'custom-scrollbar sticky z-30 overflow-y-auto',
              ORDER_STICKY_TOP_CLASS,
              ORDER_STICKY_MAX_H_CLASS,
            )}
          >
            <CreateOrderSummaryPanel form={form} onSubmit={handleSubmit} />
          </div>
        </div>

        <div className="xl:hidden">
          <CreateOrderSummaryPanel form={form} onSubmit={handleSubmit} showActions={false} />
        </div>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 xl:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Grand Total</p>
            <p className="truncate text-base font-semibold tabular-nums">
              {formatCurrency(form.totals.grandTotal)}
            </p>
          </div>
          <Button type="button" className="shrink-0" onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
