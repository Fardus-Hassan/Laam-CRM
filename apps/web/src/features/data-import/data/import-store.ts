import type { ImportCustomerRow, ImportJobResult, ImportOrderRow, ImportRowError } from '@laam/types';

import { upsertMockCustomerFromImport } from '@/features/customers/data/mock-customers';
import { createMockOrder } from '@/features/orders/data/mock-orders';
import { mockCustomerStore } from '@/features/customers/data/mock-customers';
import { getOrderStore } from '@/features/orders/data/mock-orders';

export type ChunkProgress = {
  processed: number;
  success: number;
  errors: ImportRowError[];
};

const CHUNK_SIZE = 500;

/**
 * Process rows in chunks so 10k–20k imports stay responsive in the browser.
 */
export async function processInChunks<T>(
  rows: T[],
  validateAndInsert: (row: T, rowNumber: number) => ImportRowError | null,
  onProgress: (progress: ChunkProgress) => void,
): Promise<ChunkProgress> {
  let processed = 0;
  let success = 0;
  const errors: ImportRowError[] = [];

  for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
    const chunk = rows.slice(start, start + CHUNK_SIZE);
    for (let i = 0; i < chunk.length; i++) {
      const rowNumber = start + i + 2;
      const error = validateAndInsert(chunk[i], rowNumber);
      processed++;
      if (error) errors.push(error);
      else success++;
    }
    onProgress({ processed, success, errors: errors.slice(0, 50) });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return { processed, success, errors };
}

export function validateCustomerRow(
  row: Record<string, string>,
  rowNumber: number,
): { data?: ImportCustomerRow; error?: ImportRowError } {
  const name = row.name ?? row.customer_name ?? '';
  const phone = (row.phone ?? row.mobile ?? row.customer_phone ?? '').replace(/\D/g, '');
  if (!name.trim()) {
    return { error: { row: rowNumber, field: 'name', message: 'Name is required' } };
  }
  if (phone.length < 8) {
    return { error: { row: rowNumber, field: 'phone', message: 'Valid phone is required' } };
  }
  return {
    data: {
      name: name.trim(),
      phone,
      email: row.email || undefined,
      address: row.address || undefined,
      district: row.district || row.area || undefined,
      tags: row.tags || undefined,
      notes: row.notes || undefined,
    },
  };
}

export function validateOrderRow(
  row: Record<string, string>,
  rowNumber: number,
): { data?: ImportOrderRow; error?: ImportRowError } {
  const customer_name = row.customer_name ?? row.name ?? '';
  const customer_phone = (row.customer_phone ?? row.phone ?? row.mobile ?? '').replace(/\D/g, '');
  const product_name = row.product_name ?? row.product ?? '';
  const quantity = Number(row.quantity ?? row.qty ?? 1);
  const unit_price = Number(row.unit_price ?? row.price ?? row.amount ?? 0);

  if (!customer_name.trim()) {
    return { error: { row: rowNumber, field: 'customer_name', message: 'Customer name is required' } };
  }
  if (customer_phone.length < 8) {
    return { error: { row: rowNumber, field: 'customer_phone', message: 'Valid phone is required' } };
  }
  if (!product_name.trim()) {
    return { error: { row: rowNumber, field: 'product_name', message: 'Product name is required' } };
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { error: { row: rowNumber, field: 'quantity', message: 'Quantity must be >= 1' } };
  }
  if (!Number.isFinite(unit_price) || unit_price < 0) {
    return { error: { row: rowNumber, field: 'unit_price', message: 'Unit price is invalid' } };
  }

  return {
    data: {
      order_number: row.order_number || row.order_id || undefined,
      customer_name: customer_name.trim(),
      customer_phone,
      address: row.address || undefined,
      district: row.district || row.area || undefined,
      product_name: product_name.trim(),
      quantity,
      unit_price,
      delivery_charge: row.delivery_charge ? Number(row.delivery_charge) : undefined,
      discount: row.discount ? Number(row.discount) : undefined,
      status: row.status || 'pending',
      payment_status: row.payment_status || 'cod',
      source: row.source || 'import',
      notes: row.notes || undefined,
      created_at: row.created_at || row.date || undefined,
    },
  };
}

export function insertCustomerRow(data: ImportCustomerRow): void {
  upsertMockCustomerFromImport(data);
}

export function insertOrderRow(data: ImportOrderRow): void {
  const phone = data.customer_phone.startsWith('0')
    ? data.customer_phone
    : `0${data.customer_phone}`;
  const sources = ['facebook', 'call', 'ecommerce', 'walk_in'] as const;
  const source = sources.includes(data.source as (typeof sources)[number])
    ? (data.source as (typeof sources)[number])
    : 'call';
  const statuses = ['pending', 'confirmed', 'delivered', 'cancelled'] as const;
  const status = statuses.includes(data.status as (typeof statuses)[number])
    ? (data.status as (typeof statuses)[number])
    : 'pending';
  const payments = ['cod', 'paid', 'partial', 'refunded'] as const;
  const paymentStatus = payments.includes(data.payment_status as (typeof payments)[number])
    ? (data.payment_status as (typeof payments)[number])
    : 'cod';

  createMockOrder({
    customerName: data.customer_name,
    customerPhone: phone,
    shippingAddress: data.address ?? '',
    shippingArea: data.district ?? 'Dhaka',
    source,
    status,
    paymentStatus,
    deliveryCharge: data.delivery_charge ?? 60,
    discount: data.discount ?? 0,
    lineItems: [
      {
        productName: data.product_name,
        quantity: data.quantity,
        unitPrice: data.unit_price,
      },
    ],
    notes: data.notes,
    skipFollowup: true,
  });
}

export function getImportStats(): { customers: number; orders: number } {
  return {
    customers: mockCustomerStore.filter((c) => c.tags.includes('Imported')).length,
    orders: getOrderStore().length,
  };
}

export function buildCompletedResult(
  entityType: ImportJobResult['entityType'],
  progress: ChunkProgress,
): ImportJobResult {
  return {
    entityType,
    status: progress.errors.length && progress.success === 0 ? 'failed' : 'completed',
    totalRows: progress.processed,
    processedRows: progress.processed,
    successCount: progress.success,
    errorCount: progress.errors.length,
    errors: progress.errors.slice(0, 50),
    finishedAt: new Date().toISOString(),
  };
}
