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
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type PrintPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDetail;
  type: 'invoice' | 'packing';
};

function formatPrintDate(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function absoluteUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (typeof window === 'undefined') return url;
  return new URL(url, window.location.origin).href;
}

function buildPrintDocumentHtml({
  order,
  type,
  brandName,
  logoUrl,
  primaryColor,
}: {
  order: OrderDetail;
  type: 'invoice' | 'packing';
  brandName: string;
  logoUrl: string;
  primaryColor: string;
}) {
  const isInvoice = type === 'invoice';
  const title = isInvoice ? 'Sales invoice' : 'Packing / dispatch slip';
  const lines = order.lineItems
    .map((line, index) => {
      const meta = [line.variationLabel, line.sku].filter(Boolean).join(' · ');
      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="item-name">${escapeHtml(line.productName)}</div>
            ${meta ? `<div class="item-meta">${escapeHtml(meta)}</div>` : ''}
          </td>
          <td class="num">${line.quantity}</td>
          ${
            isInvoice
              ? `<td class="num">${escapeHtml(formatCurrency(line.unitPrice))}</td>
                 <td class="num">${escapeHtml(formatCurrency(line.lineTotal))}</td>`
              : ''
          }
        </tr>`;
    })
    .join('');

  const moneyBlock = isInvoice
    ? `
      <div class="totals">
        <div><span>Subtotal</span><span>${escapeHtml(formatCurrency(order.subtotal))}</span></div>
        <div><span>Delivery</span><span>${escapeHtml(formatCurrency(order.deliveryCharge))}</span></div>
        ${
          order.discount
            ? `<div><span>Discount</span><span>−${escapeHtml(formatCurrency(order.discount))}</span></div>`
            : ''
        }
        <div class="grand"><span>Total</span><span>${escapeHtml(formatCurrency(order.amount))}</span></div>
        ${
          (order.paidAmount ?? 0) > 0
            ? `<div><span>Paid</span><span>${escapeHtml(formatCurrency(order.paidAmount ?? 0))}</span></div>
               <div><span>Due</span><span>${escapeHtml(
                 formatCurrency(Math.max(0, order.amount - (order.paidAmount ?? 0))),
               )}</span></div>`
            : ''
        }
      </div>`
    : `
      <div class="notes">
        <p><strong>Total pieces:</strong> ${order.lineItems.reduce((s, l) => s + l.quantity, 0)}</p>
        ${
          order.packingNote
            ? `<p><strong>Packing note:</strong> ${escapeHtml(order.packingNote)}</p>`
            : ''
        }
        ${
          order.courierNote
            ? `<p><strong>Courier note:</strong> ${escapeHtml(order.courierNote)}</p>`
            : ''
        }
      </div>`;

  const logoHtml = logoUrl
    ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" />`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(brandName)} — ${escapeHtml(order.orderNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #111;
      background: #fff;
      font-size: 13px;
      line-height: 1.45;
    }
    .sheet { max-width: 800px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      border-bottom: 2px solid ${escapeHtml(primaryColor)};
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand { display: flex; gap: 12px; align-items: center; }
    .logo { height: 48px; width: auto; max-width: 180px; object-fit: contain; }
    .brand-name { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: ${escapeHtml(primaryColor)}; }
    .doc-type { margin: 2px 0 0; color: #555; font-size: 12px; }
    .meta { text-align: right; }
    .meta strong { font-size: 15px; }
    .meta .muted { color: #666; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .label { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #666; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #555;
      background: #f4f6f5;
      border-top: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
      padding: 8px 6px;
    }
    td { padding: 9px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .item-name { font-weight: 600; }
    .item-meta { color: #666; font-size: 11px; margin-top: 2px; }
    .totals {
      margin-left: auto;
      margin-top: 16px;
      width: 260px;
    }
    .totals div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 3px 0;
    }
    .totals .grand {
      border-top: 1px solid #ccc;
      margin-top: 6px;
      padding-top: 8px;
      font-size: 15px;
      font-weight: 700;
    }
    .notes { margin-top: 16px; }
    .footer-note {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px dashed #ccc;
      color: #666;
      font-size: 11px;
    }
    @media print {
      body { padding: 0; }
      .sheet { max-width: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        ${logoHtml}
        <div>
          <div class="brand-name">${escapeHtml(brandName)}</div>
          <div class="doc-type">${escapeHtml(title)}</div>
        </div>
      </div>
      <div class="meta">
        <div><strong>${escapeHtml(order.orderNumber)}</strong></div>
        <div class="muted">${escapeHtml(formatPrintDate(order.createdAt))}</div>
        <div class="muted">${escapeHtml(order.status.replaceAll('_', ' '))}</div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="label">Bill to / Ship to</div>
        <div><strong>${escapeHtml(order.customerName)}</strong></div>
        <div>${escapeHtml(order.customerPhone)}</div>
        ${order.altMobile ? `<div>Alt: ${escapeHtml(order.altMobile)}</div>` : ''}
        <div style="margin-top:6px">${escapeHtml(order.shippingAddress)}</div>
        <div class="muted">${escapeHtml(
          [order.shippingArea, order.district].filter(Boolean).join(' · '),
        )}</div>
      </div>
      <div style="text-align:right">
        <div class="label">Order info</div>
        <div>Payment: ${escapeHtml(order.paymentStatus.toUpperCase())}</div>
        ${order.paymentMethod ? `<div>Method: ${escapeHtml(order.paymentMethod)}</div>` : ''}
        ${order.referenceNo ? `<div>Ref: ${escapeHtml(order.referenceNo)}</div>` : ''}
        ${order.assignedAgentName ? `<div>Agent: ${escapeHtml(order.assignedAgentName)}</div>` : ''}
        ${order.couponCode ? `<div>Coupon: ${escapeHtml(order.couponCode)}</div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Product</th>
          <th class="num">Qty</th>
          ${isInvoice ? '<th class="num">Rate</th><th class="num">Total</th>' : ''}
        </tr>
      </thead>
      <tbody>${lines}</tbody>
    </table>

    ${moneyBlock}

    ${
      isInvoice && (order.customerNote || order.notes)
        ? `<div class="footer-note">
            ${order.customerNote ? `<div>Customer note: ${escapeHtml(order.customerNote)}</div>` : ''}
            ${order.notes ? `<div>Internal: ${escapeHtml(order.notes)}</div>` : ''}
          </div>`
        : ''
    }
  </div>
</body>
</html>`;
}

function printHtmlDocument(html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print document');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument ?? frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error('Could not create print frame');
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const cleanup = () => {
    iframe.remove();
  };

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      // Keep iframe briefly so the print dialog can read layout, then remove.
      window.setTimeout(cleanup, 1000);
    }
  };

  // Images (logo) may still be loading — wait a beat, then print.
  window.setTimeout(triggerPrint, 400);
}

export function PrintPreviewDialog({
  open,
  onOpenChange,
  order,
  type,
}: PrintPreviewDialogProps) {
  const brand = useBrand();
  const isInvoice = type === 'invoice';
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
      printHtmlDocument(html);
      onOpenChange(false);
    } catch {
      toast.error('Could not open print dialog. Try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isInvoice ? 'Invoice' : 'Packing slip'} — {order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div
          className={cn(
            'rounded-lg border border-border bg-white p-6 text-zinc-900 shadow-sm',
          )}
        >
          <div className="mb-5 flex items-start justify-between gap-4 border-b pb-4"
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
