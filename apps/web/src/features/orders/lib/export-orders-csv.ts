import type { OrderListRow } from '@laam/types';

function escapeCsv(value: string | number | undefined | null): string {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportOrdersToCsv(rows: OrderListRow[], filename = 'orders-export.csv') {
  const headers = [
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

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
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
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
