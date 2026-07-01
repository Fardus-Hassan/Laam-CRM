'use client';

import Link from 'next/link';
import type { OrderDetail } from '@laam/types';
import { ArrowLeft, Printer } from 'lucide-react';

import { Can } from '@/components/auth/can';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { ORDER_STICKY_ACTION_CLASS } from '@/features/orders/components/create-order/section-layout';
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
          <Button type="button" size="sm" variant="outline" onClick={() => onPrint?.('invoice')}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}
