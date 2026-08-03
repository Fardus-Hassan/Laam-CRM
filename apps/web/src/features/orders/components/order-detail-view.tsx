'use client';

import * as React from 'react';
import type {
  OrderDetail,
  OrderCourierTracking,
  OrderFormOptionsResponse,
} from '@laam/types';
import { MapPin, StickyNote } from 'lucide-react';
import { toast } from 'sonner';

import { PageShell } from '@/components/layout/page-shell';
import { FormField } from '@/components/form/form-field';
import { FormTextarea } from '@/components/form/form-textarea';
import {
  CustomerBlock,
  orderToCustomerValue,
} from '@/features/orders/components/shared/customer-block';
import { CustomerOrderHistoryCard } from '@/features/orders/components/shared/customer-order-history-card';
import { CourierPhoneHistoryPanel } from '@/features/courier/components/courier-phone-history-panel';
import { CourierTrackingCard } from '@/features/orders/components/shared/courier-tracking-card';
import { EditableSectionCard } from '@/features/orders/components/shared/editable-section-card';
import { LinkedLeadCard } from '@/features/orders/components/shared/linked-lead-card';
import { OrderRelatedLinks } from '@/features/orders/components/shared/order-related-links';
import { MoneySummaryPanel } from '@/features/orders/components/shared/money-summary-panel';
import { OrderActionBar } from '@/features/orders/components/shared/order-action-bar';
import { OrderAssignSheet } from '@/features/orders/components/shared/order-assign-sheet';
import { OrderDetailHeader } from '@/features/orders/components/shared/order-detail-header';
import { OrderExtrasCard } from '@/features/orders/components/shared/order-extras-card';
import { OrderLineItemsCard } from '@/features/orders/components/shared/order-line-items-card';
import { OrderStatusDialog } from '@/features/orders/components/shared/order-status-dialog';
import { OrderTimeline } from '@/features/orders/components/shared/order-timeline';
import { PrintPreviewDialog } from '@/features/orders/components/shared/print-preview-dialog';
import {
  ORDER_PAGE_GAP,
  ORDER_SIDEBAR_GRID_CLASS,
  ORDER_STICKY_MAX_H_CLASS,
  ORDER_STICKY_TOP_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { ordersApi } from '@/features/orders/api/orders-api';
import { useOrderDetailMutations } from '@/features/orders/hooks/use-order-mutations';
import { createOrderDetailBreadcrumbs } from '@/features/orders/lib/order-breadcrumbs';
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
  const [deliveryNote, setDeliveryNote] = React.useState(order.notes ?? '');
  const [customerDraft, setCustomerDraft] = React.useState(orderToCustomerValue(order));
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [formOptions, setFormOptions] = React.useState<OrderFormOptionsResponse | null>(null);

  const { confirmOrder, cancelOrder, deleteOrder, changeStatus, updateOrder } =
    useOrderDetailMutations(order, setOrder);

  React.useEffect(() => {
    let cancelled = false;
    void ordersApi.getFormOptions().then((options) => {
      if (!cancelled) setFormOptions(options);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Soft refresh courier status while detail page is open (no full reload)
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
          setOrder(updated);
          setCustomerDraft(orderToCustomerValue(updated));
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

  React.useEffect(() => {
    setOrder(initialOrder);
    setCustomerDraft(orderToCustomerValue(initialOrder));
    setDeliveryNote(initialOrder.notes ?? '');
  }, [initialOrder]);

  return (
    <PageShell
      title={order.orderNumber}
      description={order.customerName}
      breadcrumbs={createOrderDetailBreadcrumbs(order.orderNumber, order.status)}
    >
      <div className={cn(ORDER_PAGE_GAP)}>
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
          onCourierBooked={(updated) => {
            setOrder(updated);
            setCustomerDraft(orderToCustomerValue(updated));
            setDeliveryNote(updated.notes ?? '');
          }}
        />

        <OrderDetailHeader order={order} />

        <div className={cn('grid items-start gap-4', ORDER_SIDEBAR_GRID_CLASS)}>
          <div className="min-w-0 space-y-4">
            <OrderLineItemsCard
              order={order}
              onReturned={(updated) => setOrder(updated)}
              onSaveLineItems={async (lineItems) => {
                const updated = await updateOrder(order.id, {
                  lineItems: lineItems.map((line) => ({
                    productName: line.productName,
                    sku: line.sku,
                    productId: line.productId,
                    variantId: line.variantId,
                    variationLabel: line.variationLabel,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    discount: line.discount,
                  })),
                });
                setOrder(updated);
              }}
            />

            <CustomerBlock
              mode="edit"
              value={customerDraft}
              onChange={setCustomerDraft}
              districts={formOptions?.districts}
              sources={formOptions?.sources}
              onSave={async () => {
                const updated = await updateOrder(order.id, {
                  customerName: customerDraft.name,
                  customerPhone: customerDraft.phone,
                  customerEmail: customerDraft.email,
                  shippingAddress: customerDraft.address,
                  shippingArea: customerDraft.area,
                  district: customerDraft.district,
                  source: customerDraft.source,
                });
                setCustomerDraft(orderToCustomerValue(updated));
              }}
            />

            <EditableSectionCard
              title="Delivery & notes"
              icon={<MapPin className="size-4 text-primary" />}
              editContent={
                <FormField label="Internal note">
                  <FormTextarea
                    rows={3}
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                  />
                </FormField>
              }
              onSave={async () => {
                const updated = await updateOrder(order.id, { notes: deliveryNote });
                setDeliveryNote(updated.notes ?? '');
              }}
              onCancel={() => setDeliveryNote(order.notes ?? '')}
            >
              <div className="space-y-3 text-sm">
                <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/15 p-2.5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Shipping address
                    </p>
                    <p className="mt-0.5 leading-relaxed">{order.shippingAddress}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Area
                    </p>
                    <p className="mt-0.5 font-medium">{order.shippingArea || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Assigned agent
                    </p>
                    <p className="mt-0.5 font-medium">{order.assignedAgentName ?? 'Unassigned'}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <StickyNote className="size-3.5" />
                    Internal note
                  </p>
                  {order.notes ? (
                    <p className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2 leading-relaxed text-foreground">
                      {order.notes}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No internal notes yet.</p>
                  )}
                </div>
              </div>
            </EditableSectionCard>

            <OrderExtrasCard
              order={order}
              options={formOptions}
              onSave={async (patch) => {
                const updated = await updateOrder(order.id, patch);
                setOrder(updated);
                return updated;
              }}
            />
          </div>

          <aside
            className={cn(
              'space-y-4 xl:sticky xl:self-start',
              ORDER_STICKY_TOP_CLASS,
              ORDER_STICKY_MAX_H_CLASS,
              'xl:overflow-y-auto',
            )}
          >
            <MoneySummaryPanel
              mode="readonly"
              order={order}
              onCollected={() => {
                void ordersApi.getOrder(order.orderNumber).then((updated) => {
                  if (updated) setOrder(updated);
                });
              }}
            />
            <CustomerOrderHistoryCard phone={order.customerPhone} currentOrderId={order.id} />
            <CourierPhoneHistoryPanel phone={order.customerPhone} />
            <OrderTimeline events={order.timeline} />
            {courierTracking ? <CourierTrackingCard tracking={courierTracking} /> : null}
            {order.leadId ? <LinkedLeadCard leadId={order.leadId} /> : null}
            <OrderRelatedLinks order={order} />
          </aside>
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
          setOrder(updated);
        }}
      />

      <OrderStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        currentStatus={order.status}
        onSelect={changeStatus}
      />
    </PageShell>
  );
}
