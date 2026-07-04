import type { RecycleBinItem, RecycleListQuery } from '@laam/types';

import { upsertMockCustomerFromImport } from '@/features/customers/data/mock-customers';
import { createMockOrder } from '@/features/orders/data/mock-orders';
import { createMockProduct } from '@/features/inventory/data/mock-inventory';

let items: RecycleBinItem[] = [
  { id: 'rb-1', entityType: 'order', entityId: 'ord-old-1', title: 'MH-8701', subtitle: 'Fatima Begum · 01712345678', deletedBy: 'Sakib Ahmed', deletedAt: '2026-07-03T10:00:00Z', purgeAt: '2026-08-02T10:00:00Z' },
  { id: 'rb-2', entityType: 'customer', entityId: 'cust-old-1', title: 'Test Buyer', subtitle: '01700001111', deletedBy: 'Laam Org Admin', deletedAt: '2026-07-02T14:00:00Z', purgeAt: '2026-08-01T14:00:00Z' },
  { id: 'rb-3', entityType: 'product', entityId: 'prod-old-1', title: 'Old Modhu Jar', subtitle: 'SKU: OLD-MDH', deletedBy: 'Imran Hossain', deletedAt: '2026-07-01T09:00:00Z', purgeAt: '2026-07-31T09:00:00Z' },
  { id: 'rb-4', entityType: 'lead', entityId: 'lead-old-1', title: 'Facebook lead — Mirpur', subtitle: '01811223344', deletedBy: 'Mitu Rahman', deletedAt: '2026-06-30T16:00:00Z', purgeAt: '2026-07-30T16:00:00Z' },
  { id: 'rb-5', entityType: 'contact', entityId: 'con-old-1', title: 'Supplier draft', subtitle: 'supplier@test.com', deletedBy: 'Laam Org Admin', deletedAt: '2026-06-28T11:00:00Z', purgeAt: '2026-07-28T11:00:00Z' },
];

export function listRecycleItems(query: RecycleListQuery = {}): RecycleBinItem[] {
  let result = [...items];
  if (query.entityType) result = result.filter((i) => i.entityType === query.entityType);
  if (query.search) {
    const q = query.search.toLowerCase();
    result = result.filter(
      (i) => i.title.toLowerCase().includes(q) || i.subtitle?.toLowerCase().includes(q),
    );
  }
  return result;
}

export function restoreItem(id: string): boolean {
  const item = items.find((i) => i.id === id);
  if (!item) return false;

  if (item.entityType === 'customer') {
    const phone = (item.subtitle ?? '01700000000').replace(/\D/g, '') || '01700000000';
    upsertMockCustomerFromImport({
      name: item.title,
      phone: phone.startsWith('0') ? phone : `0${phone}`,
      tags: 'Restored',
    });
  }

  if (item.entityType === 'order') {
    const phoneMatch = item.subtitle?.match(/01\d{9}/);
    const phone = phoneMatch?.[0] ?? '01700000000';
    const name = item.subtitle?.split('·')[0]?.trim() ?? 'Restored customer';
    createMockOrder({
      customerName: name,
      customerPhone: phone,
      shippingAddress: 'Restored address',
      shippingArea: 'Dhaka',
      source: 'call',
      status: 'pending',
      paymentStatus: 'cod',
      deliveryCharge: 60,
      discount: 0,
      lineItems: [{ productName: 'Modhu 500g', quantity: 1, unitPrice: 850 }],
      notes: `Restored from recycle bin (${item.title})`,
      skipFollowup: true,
    });
  }

  if (item.entityType === 'product') {
    createMockProduct({
      name: item.title,
      sku: item.subtitle?.replace('SKU: ', '') ?? 'RESTORED',
      category: 'honey',
      status: 'active',
      reorderLevel: 5,
      variants: [
        {
          id: 'v1',
          label: 'Default',
          sku: item.subtitle?.replace('SKU: ', '') ?? 'RESTORED',
          stock: 10,
          salePrice: 850,
          costPrice: 500,
          reorderLevel: 5,
        },
      ],
      tags: ['Restored'],
    });
  }

  items = items.filter((i) => i.id !== id);
  return true;
}

export function purgeItem(id: string): boolean {
  const before = items.length;
  items = items.filter((i) => i.id !== id);
  return items.length < before;
}
