'use client';

import * as React from 'react';
import Link from 'next/link';
import type { OrderDetail } from '@laam/types';
import {
  ArrowLeft,
  Barcode,
  MessageSquare,
  Printer,
  Truck,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrderSmsDialog } from '@/features/orders/components/shared/order-sms-dialog';
import { ORDER_STICKY_ACTION_CLASS } from '@/features/orders/components/create-order/section-layout';
import { pathaoCourierApi } from '@/features/orders/api/pathao-courier-api';
import { carrybeeCourierApi } from '@/features/orders/api/carrybee-courier-api';
import { ordersApi } from '@/features/orders/api/orders-api';
import type { OrderPrintType } from '@/features/orders/components/shared/order-print';
import { useConnectedCouriers } from '@/features/courier/hooks/use-connected-couriers';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { cn } from '@/lib/utils';

type OrderActionBarProps = {
  order: OrderDetail;
  onConfirm?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  onStatusClick?: () => void;
  onPrint?: (type: Extract<OrderPrintType, 'invoice' | 'packing' | 'barcode'>) => void;
  onCourierBooked?: (order: OrderDetail) => void;
  backHref?: string;
  className?: string;
};

function collectAmount(order: OrderDetail) {
  return Math.max(0, order.amount - (order.paidAmount ?? 0));
}

export function OrderActionBar({
  order,
  onConfirm,
  onCancel,
  onDelete,
  onAssign,
  onStatusClick,
  onPrint,
  onCourierBooked,
  backHref = '/dashboard/orders',
  className,
}: OrderActionBarProps) {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [smsOpen, setSmsOpen] = React.useState(false);
  const [bookOpen, setBookOpen] = React.useState(false);
  const [courierLoading, setCourierLoading] = React.useState(false);
  const { can } = usePermissions();
  const { isProviderConnected } = useConnectedCouriers();
  const showPathao = isProviderConnected('pathao');
  const showCarrybee = isProviderConnected('carrybee');
  const canConfirm =
    order.status === 'pending' || order.status === 'pending_2' || order.status === 'pending_3';
  const canCancel =
    order.status !== 'delivered' &&
    order.status !== 'cancelled' &&
    order.status !== 'completed';
  const showCancel = can('orders.cancel');

  const hasPathaoIds = Boolean(
    order.pathaoCityId && order.pathaoZoneId && order.pathaoAreaId,
  );
  const hasAddressForCourier = (order.shippingAddress?.trim().length ?? 0) >= 10;
  const canBookPathao = hasPathaoIds || hasAddressForCourier;
  const hasCarrybeeIds = Boolean(order.carrybeeCityId && order.carrybeeZoneId);
  const canBookCarrybee = hasCarrybeeIds || hasAddressForCourier;
  const alreadyBooked = Boolean(order.courierConsignmentId);
  const due = collectAmount(order);
  const [bookProvider, setBookProvider] = React.useState<'pathao' | 'carrybee'>('pathao');
  const canManageCourier = can('courier.manage');

  const bookLocationLabel = React.useMemo(() => {
    const fromCourier =
      bookProvider === 'carrybee'
        ? [order.carrybeeArea, order.carrybeeZone, order.carrybeeCity]
            .filter(Boolean)
            .join(', ')
        : [order.pathaoArea, order.pathaoZone, order.pathaoCity]
            .filter(Boolean)
            .join(', ');
    return fromCourier || order.shippingAddress?.trim() || '—';
  }, [bookProvider, order]);

  async function handleBookPathao() {
    setCourierLoading(true);
    try {
      const updated = await pathaoCourierApi.bookOrder(order.id);
      toast.success(
        updated.courierConsignmentId
          ? `Booked Pathao · ${updated.courierConsignmentId}`
          : `${order.orderNumber} booked with Pathao`,
      );
      setBookOpen(false);
      onCourierBooked?.(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Pathao booking failed');
    } finally {
      setCourierLoading(false);
    }
  }

  async function handleBookCarrybee() {
    setCourierLoading(true);
    try {
      const updated = await carrybeeCourierApi.bookOrder(order.id);
      toast.success(
        updated.courierConsignmentId
          ? `Booked Carrybee · ${updated.courierConsignmentId}`
          : `${order.orderNumber} booked with Carrybee`,
      );
      setBookOpen(false);
      onCourierBooked?.(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Carrybee booking failed');
    } finally {
      setCourierLoading(false);
    }
  }

  function handlePathaoClick() {
    if (alreadyBooked) {
      toast.message(
        `Already booked: ${order.courierConsignmentId ?? order.courierTrackingCode}`,
      );
      return;
    }
    if (!order.fulfillmentWarehouseId && !order.stockDeducted) {
      toast.error(
        'Select a fulfillment warehouse before booking courier (stock is cut from that warehouse)',
      );
      return;
    }
    if (!canBookPathao) {
      toast.error(
        'Add a delivery address (min 10 chars), or pick a location to fill the address',
      );
      return;
    }
    setBookProvider('pathao');
    setBookOpen(true);
  }

  function handleCarrybeeClick() {
    if (alreadyBooked) {
      toast.message(
        `Already booked: ${order.courierConsignmentId ?? order.courierTrackingCode}`,
      );
      return;
    }
    if (!order.fulfillmentWarehouseId && !order.stockDeducted) {
      toast.error(
        'Select a fulfillment warehouse before booking courier (stock is cut from that warehouse)',
      );
      return;
    }
    if (!canBookCarrybee) {
      toast.error(
        'Add a delivery address (min 10 chars), or pick a location to fill the address',
      );
      return;
    }
    setBookProvider('carrybee');
    setBookOpen(true);
  }

  async function handleCancelCourier() {
    if (!alreadyBooked) {
      toast.message('No courier booking on this order');
      return;
    }
    const provider = order.courierProvider === 'carrybee' ? 'Carrybee' : 'Pathao';
    const ok = await confirm({
      title: `Cancel ${provider} shipment?`,
      description: `Cancel shipment ${order.courierConsignmentId}? This cancels the parcel at ${provider} and clears the booking link. The CRM order stays open (In Courier → Confirmed) so you can rebook.`,
      confirmLabel: 'Cancel courier',
      destructive: true,
    });
    if (!ok) return;
    setCourierLoading(true);
    try {
      const updated = await ordersApi.cancelCourier(order.id);
      toast.success(
        `${provider} cancelled${updated.courierConsignmentId ? '' : ` · ${order.courierConsignmentId}`}`,
      );
      onCourierBooked?.(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Courier cancel failed');
    } finally {
      setCourierLoading(false);
    }
  }

  async function handleUnlinkCourier() {
    if (!alreadyBooked) {
      toast.message('No courier link on this order');
      return;
    }
    const provider = order.courierProvider === 'carrybee' ? 'Carrybee' : 'Pathao';
    const ok = await confirm({
      title: `Unlink ${provider} shipment?`,
      description: `We will try to cancel ${order.courierConsignmentId} at ${provider} first. If remote cancel fails, this still clears the CRM link — only continue if you already cancelled (or confirmed gone) in the ${provider} panel.`,
      confirmLabel: 'Cancel remotely / force unlink',
      destructive: true,
    });
    if (!ok) return;
    setCourierLoading(true);
    try {
      const updated = await ordersApi.unlinkCourier(order.id, {
        confirmRemoteCancelled: true,
      });
      toast.success(`Courier unlinked · ${order.courierConsignmentId}`);
      onCourierBooked?.(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Courier unlink failed');
    } finally {
      setCourierLoading(false);
    }
  }

  async function handleCancelOrderClick() {
    if (!onCancel) return;
    if (alreadyBooked) {
      const provider = order.courierProvider === 'carrybee' ? 'Carrybee' : 'Pathao';
      const ok = await confirm({
        title: 'Cancel this order?',
        description: `This will also cancel the ${provider} shipment (${order.courierConsignmentId}). Stock will be restocked if it was deducted.`,
        confirmLabel: 'Cancel order',
        destructive: true,
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: 'Cancel this order?',
        description: 'Stock will be restocked if it was deducted.',
        confirmLabel: 'Cancel order',
        destructive: true,
      });
      if (!ok) return;
    }
    onCancel();
  }

  async function handleDeleteClick() {
    if (!onDelete) return;
    if (alreadyBooked) {
      toast.error(
        'Cancel the courier shipment (or Cancel order) first. Delete is blocked while a consignment is linked.',
      );
      return;
    }
    const ok = await confirm({
      title: 'Move to recycle bin?',
      description: 'This does not cancel any courier parcel. Soft-delete only.',
      confirmLabel: 'Move to recycle bin',
      destructive: true,
    });
    if (!ok) return;
    onDelete();
  }

  return (
    <div className={cn(ORDER_STICKY_ACTION_CLASS, className)}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          asChild
        >
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Orders
          </Link>
        </Button>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Can permission="orders.confirm">
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={!canConfirm || !order.fulfillmentWarehouseId}
              onClick={onConfirm}
            >
              Confirm
            </Button>
          </Can>
          <Button type="button" size="sm" variant="secondary" className="h-8" onClick={onStatusClick}>
            Status
          </Button>
          <Can permission="orders.assign">
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={onAssign}>
              <UserPlus className="size-3.5" />
              Assign
            </Button>
          </Can>
          <Can permission="courier.manage">
            {showPathao ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                disabled={courierLoading || order.status === 'cancelled'}
                onClick={handlePathaoClick}
              >
                <Truck className="size-3.5" />
                {alreadyBooked && order.courierProvider === 'pathao'
                  ? 'Booked'
                  : courierLoading && bookProvider === 'pathao'
                    ? 'Booking…'
                    : 'Pathao'}
              </Button>
            ) : null}
            {showCarrybee ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                disabled={courierLoading || order.status === 'cancelled'}
                onClick={handleCarrybeeClick}
              >
                <Truck className="size-3.5" />
                {alreadyBooked && order.courierProvider === 'carrybee'
                  ? 'Booked'
                  : courierLoading && bookProvider === 'carrybee'
                    ? 'Booking…'
                    : 'Carrybee'}
              </Button>
            ) : null}
            {canManageCourier && alreadyBooked ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-8"
                  disabled={courierLoading || order.status === 'cancelled'}
                  onClick={() => void handleCancelCourier()}
                >
                  {courierLoading ? 'Cancelling…' : 'Cancel courier'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={courierLoading || order.status === 'cancelled'}
                  onClick={() => void handleUnlinkCourier()}
                  title="Clear local link if already cancelled in courier panel"
                >
                  Courier Unlink
                </Button>
              </>
            ) : null}
          </Can>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setSmsOpen(true)}
          >
            <MessageSquare className="size-3.5" />
            Send SMS
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => onPrint?.('invoice')}
          >
            <Printer className="size-3.5" />
            Print invoice
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => onPrint?.('packing')}
          >
            <Printer className="size-3.5" />
            Print packing
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => onPrint?.('barcode')}
          >
            <Barcode className="size-3.5" />
            Print barcode
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8" asChild>
            <Link href="/dashboard/courier">
              <Truck className="size-3.5" />
              Courier Dashboard
            </Link>
          </Button>

          {showCancel ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={!canCancel}
                onClick={() => void handleCancelOrderClick()}
              >
                Cancel order
              </Button>
              {onDelete ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => void handleDeleteClick()}
                >
                  Recycle bin
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <OrderSmsDialog
        open={smsOpen}
        onOpenChange={setSmsOpen}
        order={order}
      />

      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Book with {bookProvider === 'carrybee' ? 'Carrybee' : 'Pathao'}
            </DialogTitle>
            <DialogDescription>
              Creates a {bookProvider === 'carrybee' ? 'Carrybee' : 'Pathao'} consignment. Order
              status becomes <span className="font-medium text-foreground">In Courier</span>. COD
              collect = due.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Order</span>
              <span className="font-medium">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Location</span>
              <span className="max-w-[14rem] text-right font-medium">{bookLocationLabel}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Collect amount</span>
              <span className="font-semibold">
                ৳{due.toLocaleString('en-BD')}
                {due === 0 ? (
                  <span className="ml-1 font-normal text-muted-foreground">(fully paid)</span>
                ) : null}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Warehouse</span>
              <span className="max-w-[14rem] text-right font-medium">
                {order.fulfillmentWarehouseName || '—'}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBookOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={courierLoading}
              onClick={() =>
                void (bookProvider === 'carrybee' ? handleBookCarrybee() : handleBookPathao())
              }
            >
              {courierLoading ? 'Booking…' : 'Confirm book'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
