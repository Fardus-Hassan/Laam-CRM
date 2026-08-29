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
  /** Shopper IP; prefer body over transport IP when your shop backend relays the request. */
  clientIp: z.string().min(3).max(64).optional(),
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

/** First non-empty trimmed string (empty Woo shipping fields must not block billing). */
function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

/**
 * Map Woo payment_method / title → CRM form-option values (cod, bkash, …).
 * Unknown methods keep the original text so ingest still succeeds.
 */
export function normalizeWooPaymentMethod(
  method?: string | null,
  title?: string | null,
): string | undefined {
  const slug = String(method ?? '')
    .trim()
    .toLowerCase();
  const label = String(title ?? '')
    .trim()
    .toLowerCase();
  const haystack = `${slug} ${label}`.trim();
  if (!haystack) return undefined;

  // Prefer Woo gateway id, then fuzzy title (EN + common BN).
  if (
    slug === 'cod' ||
    /\bcod\b/.test(haystack) ||
    haystack.includes('cash on delivery') ||
    haystack.includes('ক্যাশ অন ডেলিভারি') ||
    haystack.includes('ক্যাশ অন')
  ) {
    return 'cod';
  }
  if (
    slug === 'bkash' ||
    slug.includes('bkash') ||
    haystack.includes('bkash') ||
    haystack.includes('বিকাশ')
  ) {
    return 'bkash';
  }
  if (
    slug === 'nagad' ||
    slug.includes('nagad') ||
    haystack.includes('nagad') ||
    haystack.includes('নগদ')
  ) {
    return 'nagad';
  }
  if (
    slug === 'stripe' ||
    slug === 'paypal' ||
    slug.includes('card') ||
    haystack.includes('card') ||
    haystack.includes('credit') ||
    haystack.includes('debit')
  ) {
    return 'card';
  }
  if (
    slug === 'bacs' ||
    slug === 'cheque' ||
    haystack.includes('bank transfer') ||
    haystack.includes('direct bank') ||
    haystack.includes('already paid') ||
    haystack.includes('prepaid')
  ) {
    return 'paid';
  }

  // Keep original title (or slug) when no CRM match — better than dropping.
  return String(title ?? method ?? '').trim() || undefined;
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
    firstNonEmpty(
      billing['phone'],
      shipping['phone'],
      order['billing_phone'],
      metaValue(meta, '_billing_phone'),
    ) || '';
  const first = firstNonEmpty(billing['first_name'], shipping['first_name']);
  const last = firstNonEmpty(billing['last_name'], shipping['last_name']);
  const name =
    `${first} ${last}`.trim() ||
    firstNonEmpty(billing['company'], shipping['company']) ||
    'Website customer';

  if (!phone) {
    throw new BadRequestException('WooCommerce order missing billing phone');
  }

  // Woo often sends shipping: { address_1: "", city: "", ... } when unset.
  // `??` does not fall through empty strings — prefer first non-empty of shipping then billing.
  const address1 = firstNonEmpty(shipping['address_1'], billing['address_1']);
  const address2 = firstNonEmpty(shipping['address_2'], billing['address_2']);
  const city = firstNonEmpty(shipping['city'], billing['city']);
  const state = firstNonEmpty(shipping['state'], billing['state']);
  const postcode = firstNonEmpty(shipping['postcode'], billing['postcode']);
  const country = firstNonEmpty(shipping['country'], billing['country']);
  const shippingAddress =
    [address1, address2, city, state, postcode, country].filter(Boolean).join(', ') ||
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
  const paymentMethod = normalizeWooPaymentMethod(
    String(order['payment_method'] ?? ''),
    String(order['payment_method_title'] ?? ''),
  );
  const paidAmount = String(order['date_paid'] ?? '').trim()
    ? Number(order['total']) || 0
    : 0;

  const clientIp = firstNonEmpty(
    order['customer_ip_address'],
    order['customer_ip'],
    metaValue(meta, '_customer_ip_address'),
  );

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
    clientIp: clientIp || undefined,
    utmSource: metaValue(meta, 'utm_source') || undefined,
    utmCampaign: metaValue(meta, 'utm_campaign') || undefined,
    utmContent: metaValue(meta, 'utm_content') || undefined,
    utmId: metaValue(meta, 'utm_id') || undefined,
    lineItems,
  });
}
