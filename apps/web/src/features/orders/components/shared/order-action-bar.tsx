'use client';

import * as React from 'react';
import Link from 'next/link';
import type { OrderDetail } from '@laam/types';
import {
  ArrowLeft,
  MoreHorizontal,
  MessageSquare,
  Printer,
  Truck,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OrderSmsDialog } from '@/features/orders/components/shared/order-sms-dialog';
import { ORDER_STICKY_ACTION_CLASS } from '@/features/orders/components/create-order/section-layout';
import { pathaoCourierApi } from '@/features/orders/api/pathao-courier-api';
import { carrybeeCourierApi } from '@/features/orders/api/carrybee-courier-api';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { cn } from '@/lib/utils';

type OrderActionBarProps = {
  order: OrderDetail;
  onConfirm?: () => void;
  onCancel?: () => void;
  onAssign?: () => void;
  onStatusClick?: () => void;
  onPrint?: (type: 'invoice' | 'packing') => void;
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
  onAssign,
  onStatusClick,
  onPrint,
  onCourierBooked,
  backHref = '/dashboard/orders',
  className,
}: OrderActionBarProps) {
  const [smsOpen, setSmsOpen] = React.useState(false);
  const [bookOpen, setBookOpen] = React.useState(false);
  const [courierLoading, setCourierLoading] = React.useState(false);
  const { can } = usePermissions();
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
  const hasCarrybeeIds = Boolean(order.carrybeeCityId && order.carrybeeZoneId);
  const alreadyBooked = Boolean(order.courierConsignmentId);
  const due = collectAmount(order);
  const [bookProvider, setBookProvider] = React.useState<'pathao' | 'carrybee'>('pathao');

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
    if (!hasPathaoIds) {
      toast.error('Select Pathao city, zone & area in Order details first');
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
    if (!hasCarrybeeIds) {
      toast.error('Select Carrybee city & zone in Order details first');
      return;
    }
    setBookProvider('carrybee');
    setBookOpen(true);
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
              disabled={!canConfirm}
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
          </Can>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="h-8 px-2">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSmsOpen(true)}>
                <MessageSquare className="size-4" />
                Send SMS
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPrint?.('invoice')}>
                <Printer className="size-4" />
                Print invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPrint?.('packing')}>
                <Printer className="size-4" />
                Print packing slip
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/courier">Courier hub</Link>
              </DropdownMenuItem>
              {showCancel ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={!canCancel}
                    className="text-destructive focus:text-destructive"
                    onClick={onCancel}
                  >
                    Cancel order
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <OrderSmsDialog
        open={smsOpen}
        onOpenChange={setSmsOpen}
        orderNumber={order.orderNumber}
        customerPhone={order.customerPhone}
        customerName={order.customerName}
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
              <span className="max-w-[14rem] text-right font-medium">
                {bookProvider === 'carrybee'
                  ? [order.carrybeeArea, order.carrybeeZone, order.carrybeeCity]
                      .filter(Boolean)
                      .join(', ') || '—'
                  : [order.pathaoArea, order.pathaoZone, order.pathaoCity]
                      .filter(Boolean)
                      .join(', ') || '—'}
              </span>
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
    </div>
  );
}
