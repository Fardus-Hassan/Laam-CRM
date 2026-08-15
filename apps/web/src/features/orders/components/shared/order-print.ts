import type { OrderDetail } from '@laam/types';
import JsBarcode from 'jsbarcode';

import { formatCurrency, formatDate } from '@/lib/format';

export type OrderPrintType = 'invoice' | 'packing' | 'label' | 'barcode';

export function parseOrderPrintType(value: string | null | undefined): OrderPrintType {
  if (value === 'packing' || value === 'label' || value === 'barcode' || value === 'invoice') {
    return value;
  }
  return 'invoice';
}

export function formatPrintDate(iso?: string) {
  return formatDate(iso ?? new Date());
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
    fontSize: 14,
    height: 56,
    margin: 4,
    textMargin: 4,
    width: 1.8,
    background: '#ffffff',
    lineColor: '#111111',
  });
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
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
  @media print {
    .sheet { max-width: none; }
  }
`;

/** Invoice / packing / shipping label — A4 default (user can still change in dialog). */
const DOCUMENT_PAGE_STYLES = `
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
`;

/**
 * Product barcode sticker: exactly one label per printed page.
 * Paper size is not forced — print dialog selection (A4 / A5 / label) wins;
 * sticker card scales so it stays stickable on products.
 */
const BARCODE_PRINT_STYLES = `
  html, body.barcode-print {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    background: #fff;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    margin: 5mm;
  }
  .barcode-page {
    box-sizing: border-box;
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2mm;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .barcode-page:last-of-type {
    page-break-after: auto;
    break-after: auto;
  }
  .barcode-sheet {
    box-sizing: border-box;
    width: min(100%, 95mm);
    max-width: 100%;
    padding: clamp(2.5mm, 1.8vw, 5mm) clamp(3mm, 2.2vw, 6mm);
    border: 1.2pt solid #111;
    border-radius: 1.5mm;
    text-align: center;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.2mm;
  }
  .barcode-sheet .brand {
    font-size: clamp(8px, 1.6vw, 11px);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #444;
    line-height: 1.15;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .barcode-sheet .order-no {
    font-size: clamp(11px, 2.2vw, 14px);
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.15;
  }
  .barcode-sheet .barcode-wrap {
    width: 100%;
    height: clamp(22mm, 18vh, 36mm);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .barcode-sheet .barcode-wrap svg {
    display: block;
    width: 100% !important;
    height: 100% !important;
    max-width: 100%;
  }
  .barcode-sheet .name {
    font-size: clamp(11px, 2.1vw, 14px);
    font-weight: 700;
    line-height: 1.15;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .barcode-sheet .phone {
    font-size: clamp(10px, 1.8vw, 12px);
    line-height: 1.15;
  }
  .barcode-sheet .meta {
    font-size: clamp(8px, 1.5vw, 10px);
    color: #444;
    line-height: 1.2;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .barcode-sheet .cod {
    font-size: clamp(11px, 2vw, 13px);
    font-weight: 700;
    line-height: 1.15;
    margin-top: 0.5mm;
  }
  @media print {
    html, body.barcode-print {
      width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .barcode-page {
      width: 100%;
      height: 100vh;
      min-height: 0;
      padding: 0;
    }
    .barcode-sheet {
      width: min(92%, 100mm);
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
    <div class="order-no">${escapeHtml(order.orderNumber)}</div>
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
  const isBarcode = opts?.bodyClass === 'barcode-print';
  const bodyClass = opts?.bodyClass ? ` class="${escapeHtml(opts.bodyClass)}"` : '';
  const pageStyles = isBarcode ? BARCODE_PRINT_STYLES : DOCUMENT_PAGE_STYLES;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --print-primary: ${escapeHtml(primaryColor)}; }
    ${isBarcode ? '' : SHARED_PRINT_STYLES}
    ${pageStyles}
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
  type: Extract<OrderPrintType, 'invoice' | 'packing' | 'barcode'>;
} & BrandPrintOpts) {
  if (type === 'barcode') {
    return buildBulkPrintDocumentHtml({
      orders: [order],
      type: 'barcode',
      brandName,
      logoUrl,
      primaryColor,
    });
  }
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
    // Exactly one barcode sticker per printed page (any paper size from print dialog).
    sheets = orders
      .map(
        (order) =>
          `<div class="barcode-page">${buildBarcodeSheet(order, brandOpts)}</div>`,
      )
      .join('\n');
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

export function printHtmlDocument(html: string, opts?: { barcode?: boolean }) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print document');
  // Off-screen frame — barcode uses flexible % layout; docs still use A4 preview size.
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = opts?.barcode ? '100vw' : '210mm';
  iframe.style.height = opts?.barcode ? '100vh' : '297mm';
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
