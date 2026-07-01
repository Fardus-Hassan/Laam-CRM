'use client';

import * as React from 'react';
import type { OrderDetail } from '@laam/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
        <DialogHeader className="no-print">
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
        <div className="no-print flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Opens your browser print dialog. PDF service in Phase 2.
          </p>
          <Button type="button" size="sm" onClick={() => window.print()}>
            Print now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
