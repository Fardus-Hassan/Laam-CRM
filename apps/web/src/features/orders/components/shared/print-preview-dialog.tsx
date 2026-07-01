'use client';

import * as React from 'react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { OrderDetail } from '@laam/types';

import { formatCurrency } from '@/lib/format';

type PrintPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDetail;
  type: 'invoice' | 'packing';
};

export function PrintPreviewDialog({
  open,
  onOpenChange,
  order,
  type,
}: PrintPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {type === 'invoice' ? 'Invoice preview' : 'Packing slip preview'} — {order.orderNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border bg-card p-6 text-foreground shadow-sm">
          <div className="mb-4 border-b border-border pb-3">
            <p className="text-lg font-bold">Laam Store</p>
            <p className="text-xs text-muted-foreground">
              {type === 'invoice' ? 'Tax Invoice' : 'Packing Slip'}
            </p>
          </div>
          <p className="text-sm">
            <strong>{order.customerName}</strong>
            <br />
            {order.customerPhone}
            <br />
            {order.shippingAddress}
          </p>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-1 text-left">Item</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems.map((line) => (
                <tr key={line.id} className="border-b border-border/50">
                  <td className="py-1">{line.productName}</td>
                  <td className="py-1 text-right">{line.quantity}</td>
                  <td className="py-1 text-right">{formatCurrency(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-right font-semibold">Total: {formatCurrency(order.amount)}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Print preview — connect PDF service in production.
        </p>
        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={() => {
            toast.success('Print dialog opened (mock)');
            onOpenChange(false);
          }}
        >
          Print now
        </button>
      </DialogContent>
    </Dialog>
  );
}
