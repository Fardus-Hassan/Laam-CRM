'use client';

import * as React from 'react';
import type { OrderDetail, OrderCourierTracking } from '@laam/types';
import { MapPin } from 'lucide-react';

import { PageShell } from '@/components/layout/page-shell';
import { FormField } from '@/components/form/form-field';
import { FormTextarea } from '@/components/form/form-textarea';
import {
  CustomerBlock,
  orderToCustomerValue,
} from '@/features/orders/components/shared/customer-block';
import { CustomerOrderHistoryCard } from '@/features/orders/components/shared/customer-order-history-card';
import { CourierTrackingCard } from '@/features/orders/components/shared/courier-tracking-card';
import { EditableSectionCard } from '@/features/orders/components/shared/editable-section-card';
import { LinkedLeadCard } from '@/features/orders/components/shared/linked-lead-card';
import { MoneySummaryPanel } from '@/features/orders/components/shared/money-summary-panel';
import { OrderActionBar } from '@/features/orders/components/shared/order-action-bar';
import { OrderAssignSheet } from '@/features/orders/components/shared/order-assign-sheet';
import { OrderDetailHeader } from '@/features/orders/components/shared/order-detail-header';
import { OrderLineItemsCard } from '@/features/orders/components/shared/order-line-items-card';
import { OrderStatusDialog } from '@/features/orders/components/shared/order-status-dialog';
import { OrderTimeline } from '@/features/orders/components/shared/order-timeline';
import { PrintPreviewDialog } from '@/features/orders/components/shared/print-preview-dialog';
import {
  ORDER_PAGE_GAP,
  ORDER_SIDEBAR_GRID_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { ordersApi } from '@/features/orders/api/orders-api';
import { useOrderDetailMutations } from '@/features/orders/hooks/use-order-mutations';
import { createOrderDetailBreadcrumbs } from '@/features/orders/lib/order-breadcrumbs';
import { cn } from '@/lib/utils';

export function OrderDetailView({ initialOrder }: { initialOrder: OrderDetail }) {
  const [order, setOrder] = React.useState(initialOrder);
  const [courierTracking, setCourierTracking] = React.useState<OrderCourierTracking | null>(null);
  const [printType, setPrintType] = React.useState<'invoice' | 'packing' | null>(null);
  const [deliveryNote, setDeliveryNote] = React.useState(order.notes ?? '');
  const [customerDraft, setCustomerDraft] = React.useState(orderToCustomerValue(order));
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);

  const { confirmOrder, cancelOrder, changeStatus, updateOrder } = useOrderDetailMutations(
    order,
    setOrder,
  );

  React.useEffect(() => {
    if (['in_courier', 'delivered', 'completed'].includes(order.status)) {
      void ordersApi.getCourierTracking(order.id).then(setCourierTracking);
    } else {
      setCourierTracking(null);
    }
  }, [order.id, order.status]);

  React.useEffect(() => {
    setOrder(initialOrder);
    setCustomerDraft(orderToCustomerValue(initialOrder));
    setDeliveryNote(initialOrder.notes ?? '');
  }, [initialOrder]);

  return (
    <PageShell
      title={order.orderNumber}
      description={`${order.customerName}`}
      breadcrumbs={createOrderDetailBreadcrumbs(order.orderNumber, order.status)}
    >
      <div className={cn(ORDER_PAGE_GAP)}>
        <OrderDetailHeader order={order} />

        <OrderActionBar
          order={order}
          onConfirm={confirmOrder}
          onCancel={cancelOrder}
          onAssign={() => setAssignOpen(true)}
          onStatusClick={() => setStatusOpen(true)}
          onPrint={(type) => setPrintType(type)}
        />

        <div className={cn('grid gap-4', ORDER_SIDEBAR_GRID_CLASS)}>
          <div className="space-y-4">
            <CustomerBlock
              mode="edit"
              value={customerDraft}
              onChange={setCustomerDraft}
              onSave={async () => {
                const updated = await updateOrder(order.id, {
                  customerName: customerDraft.name,
                  customerPhone: customerDraft.phone,
                  customerEmail: customerDraft.email,
                  shippingAddress: customerDraft.address,
                  source: customerDraft.source,
                });
                setCustomerDraft(orderToCustomerValue(updated));
              }}
            />

            <OrderLineItemsCard
              order={order}
              onSaveLineItems={async (lineItems) => {
                const updated = await updateOrder(order.id, {
                  lineItems: lineItems.map((line) => ({
                    productName: line.productName,
                    sku: line.sku,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                  })),
                });
                setOrder(updated);
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
              <div className="space-y-2 text-sm">
                <p>{order.shippingAddress}</p>
                <p className="text-muted-foreground">Area: {order.shippingArea}</p>
                <p className="text-muted-foreground">
                  Agent: {order.assignedAgentName ?? 'Unassigned'}
                </p>
                {order.notes ? (
                  <p className="rounded-md bg-muted/40 p-2 text-muted-foreground">{order.notes}</p>
                ) : (
                  <p className="text-muted-foreground">No internal notes yet.</p>
                )}
              </div>
            </EditableSectionCard>
          </div>

          <div className="space-y-4">
            <MoneySummaryPanel mode="readonly" order={order} />
            <CustomerOrderHistoryCard
              phone={order.customerPhone}
              currentOrderId={order.id}
            />
            <OrderTimeline events={order.timeline} />
            {courierTracking ? <CourierTrackingCard tracking={courierTracking} /> : null}
            {order.leadId ? <LinkedLeadCard leadId={order.leadId} /> : null}
          </div>
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
        onAssign={async (employeeName) => {
          await updateOrder(order.id, { assignedAgentName: employeeName });
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
