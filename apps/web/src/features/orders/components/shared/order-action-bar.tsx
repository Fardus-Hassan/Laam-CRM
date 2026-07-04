'use client';

import * as React from 'react';
import Link from 'next/link';
import type { OrderDetail } from '@laam/types';
import { ArrowLeft, MessageSquare, Printer, Truck } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { OrderSmsDialog } from '@/features/orders/components/shared/order-sms-dialog';
import { ORDER_STICKY_ACTION_CLASS } from '@/features/orders/components/create-order/section-layout';
import { courierApi } from '@/features/courier/api/courier-api';
import { cn } from '@/lib/utils';

type OrderActionBarProps = {
  order: OrderDetail;
  onConfirm?: () => void;
  onCancel?: () => void;
  onAssign?: () => void;
  onStatusClick?: () => void;
  onPrint?: (type: 'invoice' | 'packing') => void;
  backHref?: string;
  className?: string;
};

export function OrderActionBar({
  order,
  onConfirm,
  onCancel,
  onAssign,
  onStatusClick,
  onPrint,
  backHref = '/dashboard/orders',
  className,
}: OrderActionBarProps) {
  const [smsOpen, setSmsOpen] = React.useState(false);
  const [courierLoading, setCourierLoading] = React.useState(false);

  async function handleSendCourier() {
    setCourierLoading(true);
    try {
      await courierApi.submitOrders([order.id], 'steadfast');
      toast.success(`${order.orderNumber} submitted to courier`);
    } finally {
      setCourierLoading(false);
    }
  }

  return (
    <div className={cn(ORDER_STICKY_ACTION_CLASS, className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} kind="order" />
          <Can permission="orders.confirm">
            <Button
              type="button"
              size="sm"
              disabled={order.status !== 'pending'}
              onClick={onConfirm}
            >
              Confirm
            </Button>
          </Can>
          <Can permission="orders.cancel">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={order.status === 'delivered' || order.status === 'cancelled'}
              onClick={onCancel}
            >
              Cancel
            </Button>
          </Can>
          <Can permission="orders.assign">
            <Button type="button" size="sm" variant="secondary" onClick={onAssign}>
              Assign agent
            </Button>
          </Can>
          <Button type="button" size="sm" variant="outline" onClick={onStatusClick}>
            Change status
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setSmsOpen(true)}>
            <MessageSquare className="size-4" />
            SMS
          </Button>
          <Can permission="courier.manage">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={courierLoading || order.status === 'cancelled'}
              onClick={() => void handleSendCourier()}
            >
              <Truck className="size-4" />
              {courierLoading ? 'Sending…' : 'Courier'}
            </Button>
          </Can>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/dashboard/courier">Hub</Link>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onPrint?.('invoice')}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </div>

      <OrderSmsDialog
        open={smsOpen}
        onOpenChange={setSmsOpen}
        orderNumber={order.orderNumber}
        customerPhone={order.customerPhone}
        customerName={order.customerName}
      />
    </div>
  );
}
