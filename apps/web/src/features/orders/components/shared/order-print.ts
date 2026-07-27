import type { OrderDetail } from '@laam/types';
import JsBarcode from 'jsbarcode';

import { formatCurrency } from '@/lib/format';

export type OrderPrintType = 'invoice' | 'packing' | 'label' | 'barcode';

export function parseOrderPrintType(value: string | null | undefined): OrderPrintType {
  if (value === 'packing' || value === 'label' || value === 'barcode' || value === 'invoice') {
    return value;
  }
  return 'invoice';
}

export function formatPrintDate(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildBarcodeSvg(value: string): string {
  if (typeof document === 'undefined') {
    return `<div style="font-family:monospace;font-size:18px;font-weight:700">${escapeHtml(value)}</div>`;
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, value, {
    format: 'CODE128',
    displayValue: true,
    fontSize: 15,
    height: 64,
    margin: 0,
    textMargin: 3,
    width: 2.1,
  });
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return svg.outerHTML;
}

export function absoluteUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (typeof window === 'undefined') return url;
  return new URL(url, window.location.origin).href;
}

type BrandPrintOpts = {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
};

const SHARED_PRINT_STYLES = `
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
  .page-break { page-break-after: always; break-after: page; }
  .header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    border-bottom: 2px solid var(--print-primary);
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .brand { display: flex; gap: 12px; align-items: center; }
  .logo { height: 48px; width: auto; max-width: 180px; object-fit: contain; }
  .brand-name { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: var(--print-primary); }
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
  .label-sheet {
    max-width: 420px;
    margin: 0 auto;
    border: 2px solid #111;
    padding: 20px;
  }
  .label-sheet .order-no { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
  .label-sheet .name { font-size: 20px; font-weight: 700; }
  .label-sheet .phone { font-size: 16px; margin-top: 4px; }
  .label-sheet .address { margin-top: 12px; font-size: 14px; line-height: 1.5; }
  .label-sheet .cod {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px dashed #999;
    font-size: 16px;
    font-weight: 700;
  }
  .barcode-sheet {
    border: 1px solid #111;
    padding: 2mm 5mm;
    text-align: center;
    width: 100%;
    height: 92mm;
    max-height: 92mm;
    overflow: hidden;
    box-sizing: border-box;
  }
  .barcode-sheet .brand {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #444;
    margin: 0 0 1mm;
    line-height: 1.1;
  }
  .barcode-sheet .barcode-wrap {
    width: 100%;
    height: 50mm;
    max-height: 50mm;
    overflow: hidden;
  }
  .barcode-sheet .name {
    font-size: 13px;
    font-weight: 700;
    margin-top: 1mm;
    line-height: 1.1;
  }
  .barcode-sheet .phone {
    font-size: 11px;
    margin-top: 0.3mm;
    line-height: 1.1;
  }
  .barcode-sheet .meta {
    margin-top: 0.6mm;
    font-size: 10px;
    color: #444;
    line-height: 1.1;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .barcode-sheet .cod {
    margin-top: 1mm;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.1;
  }
  .barcode-sheet svg {
    display: block;
    width: 100% !important;
    max-width: 190mm;
    height: 50mm !important;
    max-height: 50mm !important;
  }
  .barcode-a4-page {
    position: relative;
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .barcode-a4-page:last-of-type {
    page-break-after: auto;
    break-after: auto;
  }
  .barcode-a4-page .barcode-slot {
    position: absolute;
    left: 0;
    width: 210mm;
    height: 99mm;
    padding: 3.5mm 8mm;
    box-sizing: border-box;
    overflow: hidden;
  }
  .barcode-a4-page .barcode-slot:nth-child(1) { top: 0; }
  .barcode-a4-page .barcode-slot:nth-child(2) { top: 99mm; }
  .barcode-a4-page .barcode-slot:nth-child(3) { top: 198mm; }
  body.barcode-print {
    padding: 0 !important;
    margin: 0 !important;
    width: 210mm;
  }
  @page {
    size: A4 portrait;
    margin: 0;
  }
  @media print {
    html, body.barcode-print {
      width: 210mm !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet { max-width: none; }
    .barcode-a4-page {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
    }
  }
`;

function buildInvoiceOrPackingSheet(
  order: OrderDetail,
  type: 'invoice' | 'packing',
  opts: BrandPrintOpts,
): string {
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

  const logoHtml = opts.logoUrl
    ? `<img class="logo" src="${escapeHtml(opts.logoUrl)}" alt="${escapeHtml(opts.brandName)}" />`
    : '';

  return `
  <div class="sheet">
    <div class="header">
      <div class="brand">
        ${logoHtml}
        <div>
          <div class="brand-name">${escapeHtml(opts.brandName)}</div>
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
  </div>`;
}

function buildLabelSheet(order: OrderDetail, opts: BrandPrintOpts): string {
  const due = Math.max(0, order.amount - (order.paidAmount ?? 0));
  return `
  <div class="label-sheet">
    <div class="order-no">${escapeHtml(opts.brandName)} · ${escapeHtml(order.orderNumber)}</div>
    <div class="name">${escapeHtml(order.customerName)}</div>
    <div class="phone">${escapeHtml(order.customerPhone)}</div>
    <div class="address">${escapeHtml(order.shippingAddress)}</div>
    <div class="muted" style="margin-top:6px;color:#555">${escapeHtml(
      [order.shippingArea, order.district].filter(Boolean).join(' · '),
    )}</div>
    <div class="cod">Collect: ${escapeHtml(formatCurrency(due))}</div>
  </div>`;
}

function buildBarcodeSheet(order: OrderDetail, opts: BrandPrintOpts): string {
  const due = Math.max(0, order.amount - (order.paidAmount ?? 0));
  const code = order.orderNumber.trim() || order.id;
  const productLine = order.lineItems
    .slice(0, 2)
    .map((line) => `${line.productName} ×${line.quantity}`)
    .join(' · ');
  return `
  <div class="barcode-sheet">
    <div class="brand">${escapeHtml(opts.brandName)}</div>
    <div class="barcode-wrap">${buildBarcodeSvg(code)}</div>
    <div class="name">${escapeHtml(order.customerName)}</div>
    <div class="phone">${escapeHtml(order.customerPhone)}</div>
    ${
      productLine
        ? `<div class="meta">${escapeHtml(productLine)}${
            order.lineItems.length > 2 ? ` (+${order.lineItems.length - 2})` : ''
          }</div>`
        : ''
    }
    <div class="cod">COD: ${escapeHtml(formatCurrency(due))}</div>
  </div>`;
}

function wrapPrintDocument(
  title: string,
  primaryColor: string,
  bodyInner: string,
  opts?: { bodyClass?: string },
): string {
  const bodyClass = opts?.bodyClass ? ` class="${escapeHtml(opts.bodyClass)}"` : '';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --print-primary: ${escapeHtml(primaryColor)}; }
    ${SHARED_PRINT_STYLES}
  </style>
</head>
<body${bodyClass}>
${bodyInner}
</body>
</html>`;
}

export function buildPrintDocumentHtml({
  order,
  type,
  brandName,
  logoUrl,
  primaryColor,
}: {
  order: OrderDetail;
  type: 'invoice' | 'packing';
} & BrandPrintOpts) {
  const sheet = buildInvoiceOrPackingSheet(order, type, { brandName, logoUrl, primaryColor });
  return wrapPrintDocument(`${brandName} — ${order.orderNumber}`, primaryColor, sheet);
}

export function buildBulkPrintDocumentHtml({
  orders,
  type,
  brandName,
  logoUrl,
  primaryColor,
}: {
  orders: OrderDetail[];
  type: OrderPrintType;
} & BrandPrintOpts) {
  if (orders.length === 0) {
    throw new Error('No orders to print');
  }

  const brandOpts = { brandName, logoUrl, primaryColor };

  let sheets: string;
  if (type === 'barcode') {
    const perPage = 3;
    const pages: string[] = [];
    for (let i = 0; i < orders.length; i += perPage) {
      const chunk = orders.slice(i, i + perPage);
      const slots = Array.from({ length: perPage }, (_, slotIndex) => {
        const order = chunk[slotIndex];
        const inner = order ? buildBarcodeSheet(order, brandOpts) : '';
        return `<div class="barcode-slot">${inner}</div>`;
      }).join('\n');
      pages.push(`<div class="barcode-a4-page">${slots}</div>`);
    }
    sheets = pages.join('\n');
  } else {
    sheets = orders
      .map((order, index) => {
        const sheet =
          type === 'label'
            ? buildLabelSheet(order, brandOpts)
            : buildInvoiceOrPackingSheet(order, type, brandOpts);
        const breakClass = index < orders.length - 1 ? ' page-break' : '';
        return `<div class="print-page${breakClass}">${sheet}</div>`;
      })
      .join('\n');
  }

  const title =
    type === 'barcode'
      ? `${brandName} — barcodes (${orders.length})`
      : type === 'label'
        ? `${brandName} — shipping labels (${orders.length})`
        : type === 'packing'
          ? `${brandName} — packing slips (${orders.length})`
          : `${brandName} — invoices (${orders.length})`;

  return wrapPrintDocument(title, primaryColor, sheets, {
    bodyClass: type === 'barcode' ? 'barcode-print' : undefined,
  });
}

export function printHtmlDocument(html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print document');
  // Must be A4-sized off-screen — 0×0 iframes break mm layout / page breaks in Chrome.
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
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
      window.setTimeout(cleanup, 1500);
    }
  };

  // Wait for SVG barcodes / layout to settle before printing.
  window.setTimeout(triggerPrint, 600);
}
