import { BadRequestException } from '@nestjs/common';
import type { WebsiteOrderIngestPayload } from '@laam/types';
import { z } from 'zod';

export const websiteIngestLineSchema = z.object({
  sku: z.string().optional(),
  productName: z.string().min(1),
  variationLabel: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().optional(),
});

export const websiteIngestPayloadSchema = z.object({
  externalOrderId: z.string().min(1).max(120),
  customerName: z.string().min(1),
  customerPhone: z.string().min(5),
  customerEmail: z.string().email().optional().or(z.literal('')),
  altMobile: z.string().optional(),
  shippingAddress: z.string().min(1),
  shippingArea: z.string().optional(),
  district: z.string().optional(),
  paymentMethod: z.string().optional(),
  paidAmount: z.number().nonnegative().optional(),
  deliveryCharge: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  orderDate: z.string().optional(),
  utmSource: z.string().optional(),
  utmId: z.string().optional(),
  utmContent: z.string().optional(),
  utmCampaign: z.string().optional(),
  lineItems: z.array(websiteIngestLineSchema).min(1),
});

function metaValue(
  meta: Array<Record<string, unknown>>,
  key: string,
): string | undefined {
  const hit = meta.find((m) => String(m['key'] ?? '') === key);
  const value = hit?.['value'];
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

/**
 * Map WooCommerce order.created / order.updated webhook (REST v3 shape) → canonical.
 */
export function mapWooCommercePayload(body: unknown): WebsiteOrderIngestPayload {
  const root = (body ?? {}) as Record<string, unknown>;
  const order =
    root['id'] != null
      ? root
      : ((root['data'] as Record<string, unknown> | undefined) ??
        (root['order'] as Record<string, unknown> | undefined) ??
        root);

  const id = order['id'];
  if (id == null) {
    throw new BadRequestException('WooCommerce payload missing order id');
  }

  const billing = (order['billing'] as Record<string, unknown> | undefined) ?? {};
  const shipping = (order['shipping'] as Record<string, unknown> | undefined) ?? {};
  const meta = Array.isArray(order['meta_data'])
    ? (order['meta_data'] as Array<Record<string, unknown>>)
    : [];

  const phone =
    String(billing['phone'] ?? shipping['phone'] ?? order['billing_phone'] ?? '').trim() ||
    metaValue(meta, '_billing_phone') ||
    '';
  const first = String(billing['first_name'] ?? shipping['first_name'] ?? '').trim();
  const last = String(billing['last_name'] ?? shipping['last_name'] ?? '').trim();
  const name =
    `${first} ${last}`.trim() ||
    String(billing['company'] ?? '').trim() ||
    'Website customer';

  if (!phone) {
    throw new BadRequestException('WooCommerce order missing billing phone');
  }

  const address1 = String(shipping['address_1'] ?? billing['address_1'] ?? '').trim();
  const address2 = String(shipping['address_2'] ?? billing['address_2'] ?? '').trim();
  const city = String(shipping['city'] ?? billing['city'] ?? '').trim();
  const state = String(shipping['state'] ?? billing['state'] ?? '').trim();
  const postcode = String(shipping['postcode'] ?? billing['postcode'] ?? '').trim();
  const shippingAddress =
    [address1, address2, city, state, postcode].filter(Boolean).join(', ') ||
    'Address not provided';

  const lineItemsRaw = Array.isArray(order['line_items'])
    ? (order['line_items'] as Array<Record<string, unknown>>)
    : [];
  if (!lineItemsRaw.length) {
    throw new BadRequestException('WooCommerce order has no line items');
  }

  const lineItems = lineItemsRaw.map((line) => {
    const qty = Math.max(1, Math.floor(Number(line['quantity']) || 1));
    const total = Number(line['total']) || 0;
    const subtotal = Number(line['subtotal']) || total;
    const unitPrice = qty > 0 ? subtotal / qty : 0;
    const discount = Math.max(0, subtotal - total);
    return {
      sku: String(line['sku'] ?? '').trim() || undefined,
      productName: String(line['name'] ?? 'Product').trim() || 'Product',
      quantity: qty,
      unitPrice,
      discount: discount || undefined,
    };
  });

  const shippingTotal = Number(order['shipping_total']) || 0;
  const discountTotal = Number(order['discount_total']) || 0;
  const paymentMethod =
    String(order['payment_method_title'] ?? order['payment_method'] ?? '').trim() ||
    undefined;
  const paidAmount = String(order['date_paid'] ?? '').trim()
    ? Number(order['total']) || 0
    : 0;

  return websiteIngestPayloadSchema.parse({
    externalOrderId: String(id),
    customerName: name,
    customerPhone: phone,
    customerEmail: String(billing['email'] ?? '').trim() || undefined,
    shippingAddress,
    shippingArea: city || state || undefined,
    district: state || city || undefined,
    paymentMethod,
    paidAmount: paidAmount > 0 ? paidAmount : undefined,
    deliveryCharge: shippingTotal,
    discount: discountTotal,
    notes: String(order['customer_note'] ?? '').trim() || undefined,
    orderDate:
      String(order['date_created'] ?? order['date_created_gmt'] ?? '').trim() || undefined,
    utmSource: metaValue(meta, 'utm_source') || undefined,
    utmCampaign: metaValue(meta, 'utm_campaign') || undefined,
    utmContent: metaValue(meta, 'utm_content') || undefined,
    utmId: metaValue(meta, 'utm_id') || undefined,
    lineItems,
  });
}
