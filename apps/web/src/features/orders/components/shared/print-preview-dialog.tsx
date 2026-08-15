'use client';

import * as React from 'react';
import type { OrderDetail } from '@laam/types';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBrand } from '@/features/brand/providers/brand-provider';
import {
  absoluteUrl,
  buildPrintDocumentHtml,
  formatPrintDate,
  printHtmlDocument,
  type OrderPrintType,
} from '@/features/orders/components/shared/order-print';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type PrintPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDetail;
  type: Extract<OrderPrintType, 'invoice' | 'packing' | 'barcode'>;
};

export function PrintPreviewDialog({
  open,
  onOpenChange,
  order,
  type,
}: PrintPreviewDialogProps) {
  const brand = useBrand();
  const isInvoice = type === 'invoice';
  const isBarcode = type === 'barcode';
  const logoUrl =
    brand.logos.light?.trim() ||
    brand.logos.dark?.trim() ||
    brand.logos.favicon?.trim() ||
    '';

  function handlePrint() {
    try {
      const html = buildPrintDocumentHtml({
        order,
        type,
        brandName: brand.name?.trim() || 'Store',
        logoUrl: absoluteUrl(logoUrl),
        primaryColor: brand.colors.primary || '#127A3B',
      });
      printHtmlDocument(html, { barcode: isBarcode });
      onOpenChange(false);
    } catch {
      toast.error('Could not open print dialog. Try again.');
    }
  }

  const title = isBarcode
    ? `Barcode — ${order.orderNumber}`
    : isInvoice
      ? `Invoice — ${order.orderNumber}`
      : `Packing slip — ${order.orderNumber}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {isBarcode ? (
          <div className="rounded-lg border border-border bg-white p-6 text-center text-zinc-900 shadow-sm">
            <p className="text-sm text-zinc-500">{brand.name}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{order.orderNumber}</p>
            <p className="mt-1 text-sm text-zinc-600">{order.customerName}</p>
            <p className="text-sm text-zinc-500">{order.customerPhone}</p>
            <p className="mt-4 text-sm font-semibold tabular-nums">
              COD {formatCurrency(Math.max(0, order.amount - (order.paidAmount ?? 0)))}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              Print opens a barcode sticker layout for this order.
            </p>
          </div>
        ) : (
          <div
            className={cn(
              'rounded-lg border border-border bg-white p-6 text-zinc-900 shadow-sm',
            )}
          >
            <div
              className="mb-5 flex items-start justify-between gap-4 border-b pb-4"
              style={{ borderColor: brand.colors.primary }}
            >
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={brand.name}
                    className="h-12 w-auto max-w-[160px] object-contain"
                  />
                ) : null}
                <div>
                  <p
                    className="text-xl font-bold tracking-tight"
                    style={{ color: brand.colors.primary }}
                  >
                    {brand.name}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {isInvoice ? 'Sales invoice' : 'Packing / dispatch slip'}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{order.orderNumber}</p>
                <p className="text-zinc-500">{formatPrintDate(order.createdAt)}</p>
              </div>
            </div>

            <div className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Customer
                </p>
                <p className="mt-1 font-semibold">{order.customerName}</p>
                <p>{order.customerPhone}</p>
                <p className="mt-1 leading-relaxed">{order.shippingAddress}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Summary
                </p>
                <p className="mt-1">{order.lineItems.length} line items</p>
                <p className="font-semibold tabular-nums">{formatCurrency(order.amount)}</p>
              </div>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-zinc-200 bg-zinc-50 text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-2 py-2 font-semibold">Product</th>
                  <th className="px-2 py-2 font-semibold text-right">Qty</th>
                  {isInvoice ? (
                    <th className="px-2 py-2 font-semibold text-right">Total</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {order.lineItems.map((line) => (
                  <tr key={line.id} className="border-b border-zinc-100">
                    <td className="px-2 py-2">
                      <p className="font-medium">{line.productName}</p>
                      <p className="text-xs text-zinc-500">
                        {[line.variationLabel, line.sku].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{line.quantity}</td>
                    {isInvoice ? (
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatCurrency(line.lineTotal)}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Opens the system print dialog with your brand logo & company name. Choose “Save as PDF”
            if you want a file.
          </p>
          <Button type="button" size="sm" onClick={handlePrint}>
            Print / Save PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
