import { MOCK_PRODUCTS } from '@/features/orders/data/mock-create-order';
import type { CreateOrderLineItem } from '@/features/orders/lib/create-order-types';
import type { LeadConvertPrefill } from '@/features/leads/data/mock-leads';

function nextLineId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function mapLeadPrefillToOrderLineItems(
  lines: NonNullable<LeadConvertPrefill['lineItems']>,
): CreateOrderLineItem[] {
  return lines.map((line) => {
    const product =
      MOCK_PRODUCTS.find((item) => item.sku === line.sku) ??
      MOCK_PRODUCTS.find((item) => item.name === line.productName);
    const variation = product?.variations[0];

    const unitPrice = line.unitPrice;
    const quantity = line.quantity;

    return {
      id: nextLineId(),
      productId: product?.id ?? 'custom',
      productName: line.productName,
      variationId: variation?.id ?? 'default',
      variationLabel: variation?.label ?? 'Default',
      unitPrice,
      quantity,
      discount: 0,
      subtotal: unitPrice * quantity,
    };
  });
}
