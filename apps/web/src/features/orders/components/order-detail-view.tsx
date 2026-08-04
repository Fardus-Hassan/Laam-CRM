'use client';

import * as React from 'react';
import type {
  OrderDetail,
  OrderCourierTracking,
  OrderSource,
} from '@laam/types';
import { toast } from 'sonner';

import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { CreateOrderOtherSection } from '@/features/orders/components/create-order/create-order-other-section';
import {
  ORDER_DETAIL_PAGE_GAP,
  ORDER_DETAIL_SIDEBAR_GRID_CLASS,
  ORDER_STICKY_TOP_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { CustomerOrderHistoryCard } from '@/features/orders/components/shared/customer-order-history-card';
import { CourierTrackingCard } from '@/features/orders/components/shared/courier-tracking-card';
import { CustomerBlock } from '@/features/orders/components/shared/customer-block';
import { LinkedLeadCard } from '@/features/orders/components/shared/linked-lead-card';
import { MoneySummaryPanel } from '@/features/orders/components/shared/money-summary-panel';
import { OrderActionBar } from '@/features/orders/components/shared/order-action-bar';
import { OrderAssignSheet } from '@/features/orders/components/shared/order-assign-sheet';
import { OrderDetailHeader } from '@/features/orders/components/shared/order-detail-header';
import { OrderRelatedLinks } from '@/features/orders/components/shared/order-related-links';
import { OrderReturnItemsButton } from '@/features/orders/components/shared/order-line-items-card';
import { OrderStatusDialog } from '@/features/orders/components/shared/order-status-dialog';
import { OrderTimeline } from '@/features/orders/components/shared/order-timeline';
import { PrintPreviewDialog } from '@/features/orders/components/shared/print-preview-dialog';
import { ProductPicker } from '@/features/orders/components/shared/product-picker';
import { ordersApi } from '@/features/orders/api/orders-api';
import { useCreateOrderForm } from '@/features/orders/hooks/use-create-order-form';
import { useOrderDetailMutations } from '@/features/orders/hooks/use-order-mutations';
import { createOrderDetailBreadcrumbs } from '@/features/orders/lib/order-breadcrumbs';
import { orderDetailToCreateFormPatch } from '@/features/orders/lib/order-detail-to-create-form';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const COURIER_TRACKING_STATUSES = new Set([
  'confirmed',
  'processing',
  'processing_2',
  'in_courier',
  'delivered',
  'completed',
]);

export function OrderDetailView({ initialOrder }: { initialOrder: OrderDetail }) {
  const [order, setOrder] = React.useState(initialOrder);
  const [courierTracking, setCourierTracking] = React.useState<OrderCourierTracking | null>(null);
  const [printType, setPrintType] = React.useState<'invoice' | 'packing' | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const form = useCreateOrderForm();
  const hydratedForId = React.useRef<string | null>(null);

  const { confirmOrder, cancelOrder, deleteOrder, changeStatus, updateOrder } =
    useOrderDetailMutations(order, (updated) => {
      setOrder(updated);
      // Keep live form in sync after Confirm / Cancel / Status (stock + status).
      form.patch(orderDetailToCreateFormPatch(updated));
      hydratedForId.current = updated.id;
    });

  // Load order into the same live form used by Create Order (always-editable fields).
  React.useEffect(() => {
    if (form.loadingMeta) return;
    if (hydratedForId.current === order.id) return;
    hydratedForId.current = order.id;
    form.patch(orderDetailToCreateFormPatch(order));
    // Customer Total Orders loads via CreateOrderCustomerSection when mobile is set.
  }, [form, form.loadingMeta, order]);

  React.useEffect(() => {
    setOrder(initialOrder);
    hydratedForId.current = null;
  }, [initialOrder]);

  React.useEffect(() => {
    if (COURIER_TRACKING_STATUSES.has(order.status)) {
      void ordersApi
        .getCourierTracking(order.id)
        .then(setCourierTracking)
        .catch(() => setCourierTracking(null));
    } else {
      setCourierTracking(null);
    }
  }, [order.id, order.status, order.courierStatus, order.courierStatusSyncedAt]);

  React.useEffect(() => {
    if (
      (order.courierProvider !== 'pathao' && order.courierProvider !== 'carrybee') ||
      !order.courierConsignmentId
    ) {
      return;
    }
    if (['delivered', 'completed', 'cancelled', 'returned', 'rts_carrybee'].includes(order.status)) {
      return;
    }

    let cancelled = false;
    const tick = async () => {
      try {
        const updated =
          order.courierProvider === 'carrybee'
            ? await (
                await import('@/features/orders/api/carrybee-courier-api')
              ).carrybeeCourierApi.syncOrder(order.id)
            : await (
                await import('@/features/orders/api/pathao-courier-api')
              ).pathaoCourierApi.syncOrder(order.id);
        if (!cancelled) {
          // Soft-refresh courier fields only — do not wipe unsaved form edits.
          setOrder((prev) => ({
            ...prev,
            ...updated,
            // Keep timeline from sync response
            timeline: updated.timeline ?? prev.timeline,
          }));
        }
      } catch {
        // ignore transient sync errors on soft refresh
      }
    };

    const id = window.setInterval(() => {
      void tick();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [order.id, order.courierProvider, order.courierConsignmentId, order.status]);

  function applyOrderUpdate(updated: OrderDetail) {
    setOrder(updated);
    hydratedForId.current = null;
  }

  async function handleUpdate() {
    if (saving) return;
    if (!form.validate()) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const { state, totals } = form;
      const nextLineItems = state.lineItems.map((line) => ({
        productId: line.productId || undefined,
        variantId: line.variationId || undefined,
        productName: line.productName,
        variationLabel: line.variationLabel || undefined,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
      }));
      const lineItemsChanged =
        nextLineItems.length !== order.lineItems.length ||
        nextLineItems.some((line, index) => {
          const prev = order.lineItems[index];
          if (!prev) return true;
          return (
            (line.productId ?? '') !== (prev.productId ?? '') ||
            (line.variantId ?? '') !== (prev.variantId ?? '') ||
            line.productName !== prev.productName ||
            (line.variationLabel ?? '') !== (prev.variationLabel ?? '') ||
            line.quantity !== prev.quantity ||
            line.unitPrice !== prev.unitPrice ||
            (line.discount ?? 0) !== (prev.discount ?? 0)
          );
        });

      const updated = await updateOrder(order.id, {
        customerName: state.name,
        customerPhone: state.mobile,
        customerEmail: state.email || undefined,
        altMobile: state.altMobile || undefined,
        shippingAddress: state.address,
        shippingArea: state.district || state.pathaoLocation?.city || order.shippingArea,
        district: state.district || undefined,
        source: (state.orderSource || undefined) as OrderSource | undefined,
        ...(state.orderStatus && state.orderStatus !== order.status
          ? { status: state.orderStatus as OrderDetail['status'] }
          : {}),
        paymentMethod: state.paymentMethod || undefined,
        deliveryCharge: state.shipping,
        discount: totals.orderDiscount + totals.couponDiscount,
        paidAmount: state.advancePayment,
        notes: state.orderNote || undefined,
        customerNote: state.customerNote || undefined,
        courierNote: state.courierNote || undefined,
        packingNote: state.packingNote || undefined,
        referenceNo: state.referenceNo || undefined,
        skipFollowup: state.skipFollowup,
        couponCode: state.couponApplied ? state.couponCode : undefined,
        customerTag: state.customerTag || undefined,
        orderTag: state.orderTag || undefined,
        pathaoCity: state.pathaoLocation?.city,
        pathaoZone: state.pathaoLocation?.zone,
        pathaoArea: state.pathaoLocation?.area,
        pathaoCityId: state.pathaoLocation?.cityId,
        pathaoZoneId: state.pathaoLocation?.zoneId,
        pathaoAreaId: state.pathaoLocation?.areaId,
        carrybeeCity: state.carrybeeLocation?.city,
        carrybeeZone: state.carrybeeLocation?.zone,
        carrybeeArea: state.carrybeeLocation?.area,
        carrybeeCityId: state.carrybeeLocation?.cityId,
        carrybeeZoneId: state.carrybeeLocation?.zoneId,
        carrybeeAreaId: state.carrybeeLocation?.areaId,
        attachmentNames: state.attachments.map((a) => a.name),
        attachmentUrls: state.attachments.map((a) => a.url),
        ...(lineItemsChanged ? { lineItems: nextLineItems } : {}),
      });
      setOrder(updated);
      form.patch(orderDetailToCreateFormPatch(updated));
      hydratedForId.current = updated.id;
      toast.success('Order updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function refreshOrder() {
    const updated = await ordersApi.getOrder(order.orderNumber);
    if (updated) {
      setOrder(updated);
      form.patch(orderDetailToCreateFormPatch(updated));
      hydratedForId.current = updated.id;
    }
  }

  return (
    <PageShell
      title={order.orderNumber}
      description={order.customerName}
      breadcrumbs={createOrderDetailBreadcrumbs(order.orderNumber, order.status)}
    >
      <div className={cn(ORDER_DETAIL_PAGE_GAP)}>
        <OrderActionBar
          order={order}
          onConfirm={confirmOrder}
          onDelete={async () => {
            try {
              await deleteOrder();
              toast.success('Order moved to recycle bin');
              window.location.href = '/dashboard/orders';
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Delete failed');
            }
          }}
          onCancel={async () => {
            try {
              await cancelOrder();
              toast.success(
                order.courierConsignmentId
                  ? 'Order cancelled · courier shipment cancelled'
                  : 'Order cancelled',
              );
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Cancel failed');
            }
          }}
          onAssign={() => setAssignOpen(true)}
          onStatusClick={() => setStatusOpen(true)}
          onPrint={(type) => setPrintType(type)}
          onCourierBooked={applyOrderUpdate}
        />

        <OrderDetailHeader order={order} />

        {order.stockDeducted ? (
          <div className="rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            Stock is held for this order. Product edits adjust inventory on save; Pending also
            restocks.
          </div>
        ) : null}

        {/* Create-like form + wider sticky sidebar (summary + activity/related) */}
        <div className={cn('grid items-start gap-3', ORDER_DETAIL_SIDEBAR_GRID_CLASS)}>
          <div className="min-w-0 space-y-3 pb-24 xl:pb-0">
            <div id="order-detail-customer" className="scroll-mt-24">
              <CustomerBlock mode="create" form={form} />
            </div>
            <div id="order-detail-products" className="scroll-mt-24 space-y-2">
              <div className="flex justify-end">
                <OrderReturnItemsButton
                  order={order}
                  onReturned={(updated) => {
                    setOrder(updated);
                    form.patch(orderDetailToCreateFormPatch(updated));
                    hydratedForId.current = updated.id;
                  }}
                />
              </div>
              <ProductPicker mode="create" form={form} />
            </div>
            <div id="order-detail-other" className="scroll-mt-24">
              <CreateOrderOtherSection form={form} />
            </div>
          </div>

          <aside className="min-w-0 w-full self-start">
            {/* Height follows content — no viewport max-h (avoids blank gap when stuck). */}
            <div
              className={cn(
                'flex w-full flex-col gap-3 xl:sticky xl:z-20',
                ORDER_STICKY_TOP_CLASS,
              )}
            >
              <MoneySummaryPanel
                mode="edit"
                form={form}
                order={order}
                isSaving={saving}
                className="w-full"
                onSubmit={() => void handleUpdate()}
                onCollected={() => void refreshOrder()}
              />

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <OrderTimeline
                  events={order.timeline}
                  className="w-full"
                  bodyClassName="custom-scrollbar max-h-48 overflow-y-auto pr-1"
                />
                <OrderRelatedLinks
                  order={order}
                  className="w-full"
                  bodyClassName="custom-scrollbar max-h-48 overflow-y-auto pr-1"
                />
              </div>

              <CustomerOrderHistoryCard
                phone={order.customerPhone}
                currentOrderId={order.id}
                className="w-full"
              />
              {courierTracking ? (
                <CourierTrackingCard tracking={courierTracking} className="w-full" />
              ) : null}
              {order.leadId ? <LinkedLeadCard leadId={order.leadId} className="w-full" /> : null}
            </div>
          </aside>
        </div>
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
            disabled={saving}
            onClick={() => void handleUpdate()}
          >
            {saving ? 'Updating…' : 'Update'}
          </Button>
        </div>
      </div>

      <PrintPreviewDialog
        open={printType !== null}
        onOpenChange={(open) => !open && setPrintType(null)}
        order={order}
        type={printType ?? 'invoice'}
      />

      <OrderAssignSheet
        open={assignOpen}
        onOpenChange={setAssignOpen}
        currentAgentName={order.assignedAgentName}
        onAssign={async (employeeName) => {
          const updated = await updateOrder(order.id, { assignedAgentName: employeeName });
          applyOrderUpdate(updated);
        }}
      />

      <OrderStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        currentStatus={order.status}
        onSelect={async (status) => {
          await changeStatus(status);
        }}
      />
    </PageShell>
  );
}
