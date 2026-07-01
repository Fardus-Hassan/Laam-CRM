'use client';

import type { CrmColumnDef } from '@/components/data-table';
import type { FailedOrderListItem } from '@laam/types';

import { DataTablePersonCell } from '@/components/data-table/cells';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';

const FAILED_TYPE_LABELS: Record<FailedOrderListItem['failedType'], string> = {
  duplicate: 'Duplicate',
  blocked: 'Blocked',
  other: 'Other',
};

export function buildFailedOrderTableColumns(options?: {
  onRetry?: (row: FailedOrderListItem) => void;
  onDismiss?: (row: FailedOrderListItem) => void;
}): CrmColumnDef<FailedOrderListItem>[] {
  return [
    {
      id: 'customer',
      header: 'Customer',
      meta: { priority: 'primary' },
      cell: ({ row }) => (
        <DataTablePersonCell name={row.original.customerName} phone={row.original.customerPhone} />
      ),
    },
    {
      id: 'products',
      header: 'Products',
      meta: { priority: 'primary' },
      cell: ({ row }) => (
        <p className="max-w-[200px] text-xs leading-relaxed">{row.original.products.join(', ')}</p>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-xs font-medium">{FAILED_TYPE_LABELS[row.original.failedType]}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} kind="order" />,
    },
    {
      id: 'website',
      header: 'Website',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.website ?? '—'}</span>
      ),
    },
    {
      id: 'note',
      header: 'Note',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.lastUpdateNote ?? '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" onClick={() => options?.onRetry?.(row.original)}>
            Retry
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => options?.onDismiss?.(row.original)}>
            Dismiss
          </Button>
        </div>
      ),
    },
  ];
}
