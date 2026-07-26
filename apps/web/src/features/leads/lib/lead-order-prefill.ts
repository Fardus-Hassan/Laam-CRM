import type { LeadConvertPrefill } from '@laam/types';

import { inventoryApi } from '@/features/inventory/api/inventory-api';
import type { CreateOrderLineItem } from '@/features/orders/lib/create-order-types';

function nextLineId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type PrefillLine = NonNullable<LeadConvertPrefill['lineItems']>[number];

export async function mapLeadPrefillToOrderLineItems(
  lines: NonNullable<LeadConvertPrefill['lineItems']>,
): Promise<CreateOrderLineItem[]> {
  const mapped: CreateOrderLineItem[] = [];

  for (const line of lines) {
    mapped.push(await resolveLine(line));
  }

  return mapped;
}

async function resolveLine(line: PrefillLine): Promise<CreateOrderLineItem> {
  const quantity = Math.max(1, Number(line.quantity) || 1);
  const unitPrice = Number(line.unitPrice) || 0;

  if (line.productId && line.variantId) {
    return {
      id: nextLineId(),
      productId: line.productId,
      productName: line.productName,
      variationId: line.variantId,
      variationLabel: line.variationLabel ?? 'Default',
      unitPrice,
      quantity,
      discount: 0,
      subtotal: unitPrice * quantity,
    };
  }

  try {
    const search = (line.sku || line.productName).trim();
    if (search) {
      const list = await inventoryApi.listProducts({
        search,
        filter: 'active',
        page: 1,
        pageSize: 8,
      });
      const match =
        list.items.find(
          (p) =>
            p.name.toLowerCase() === line.productName.toLowerCase() ||
            (line.sku && p.sku?.toLowerCase() === line.sku.toLowerCase()),
        ) ?? list.items[0];

      if (match) {
        const detail = await inventoryApi.getProduct(match.id);
        if (detail) {
          const variant =
            detail.variants.find(
              (v) => line.sku && v.sku?.toLowerCase() === line.sku.toLowerCase(),
            ) ?? detail.variants[0];

          if (variant) {
            const price = unitPrice || Number(variant.salePrice) || 0;
            return {
              id: nextLineId(),
              productId: detail.id,
              productName: detail.name,
              variationId: variant.id,
              variationLabel: variant.label || 'Default',
              unitPrice: price,
              quantity,
              discount: 0,
              subtotal: price * quantity,
            };
          }
        }
      }
    }
  } catch {
    // Fall through to unmatched line.
  }

  return {
    id: nextLineId(),
    productId: 'unmatched',
    productName: line.productName,
    variationId: 'default',
    variationLabel: 'Default',
    unitPrice,
    quantity,
    discount: 0,
    subtotal: unitPrice * quantity,
  };
}
