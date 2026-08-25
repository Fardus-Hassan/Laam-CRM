import type { OrderListRow } from '@laam/types';

import { downloadTable, type TableExportFormat } from '@/lib/export-csv';

const ORDER_EXPORT_HEADERS = [
  'order_number',
  'status',
  'customer_name',
  'customer_phone',
  'source',
  'amount',
  'paid',
  'due',
  'payment_status',
  'employee',
  'address',
  'created_at',
];

function orderExportRows(rows: OrderListRow[]) {
  return rows.map((row) => [
    row.orderNumber,
    row.status,
    row.customerName,
    row.customerPhone,
    row.source,
    row.amount,
    row.paid,
    row.due,
    row.paymentStatus,
    row.assignedAgentName ?? '',
    row.shippingAddress,
    row.createdAt,
  ]);
}

export function exportOrdersToCsv(rows: OrderListRow[], filename = 'orders-export.csv') {
  downloadTable(filename, ORDER_EXPORT_HEADERS, orderExportRows(rows), 'csv');
}

export function exportOrdersTable(
  rows: OrderListRow[],
  format: TableExportFormat,
  filename = 'orders-export',
) {
  downloadTable(filename, ORDER_EXPORT_HEADERS, orderExportRows(rows), format);
}
