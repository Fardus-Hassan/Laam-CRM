'use client';

import type { CrmColumnDef } from '@/components/data-table';
import type { OrderPaymentRecord } from '@laam/types';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';

export function buildPaymentTableColumns(options?: {
  onReconcile?: (row: OrderPaymentRecord) => void;
}): CrmColumnDef<OrderPaymentRecord>[] {
  return [
    {
      id: 'order',
      header: 'Order',
      meta: { priority: 'primary' },
      cell: ({ row }) => (
        <Link
          href={`/dashboard/orders/${row.original.orderNumber}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.orderNumber}
        </Link>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => row.original.customerName,
    },
    {
      id: 'method',
      header: 'Method',
      cell: ({ row }) => row.original.method.toUpperCase(),
    },
    {
      id: 'paid',
      header: 'Paid',
      cell: ({ row }) => formatCurrency(row.original.paid),
    },
    {
      id: 'due',
      header: 'Due',
      cell: ({ row }) => (
        <span className={row.original.due > 0 ? 'text-destructive' : ''}>
          {formatCurrency(row.original.due)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="text-xs font-medium capitalize">{row.original.status}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Reconcile',
      cell: ({ row }) =>
        row.original.status !== 'reconciled' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => options?.onReconcile?.(row.original)}
          >
            Reconcile
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Done</span>
        ),
    },
  ];
}
