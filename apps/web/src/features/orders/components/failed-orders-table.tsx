'use client';

import type { FailedOrderListItem } from '@laam/types';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { EntityStatusBadge } from '@/components/dashboard/entity-status-badge';
import { FormPhoneInput } from '@/components/form/form-phone-input';
import { Button } from '@/components/ui/button';

function formatFailedDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const FAILED_COLUMNS: DataTableColumn<FailedOrderListItem>[] = [
  {
    id: 'date',
    header: 'Date',
    className: 'min-w-[140px]',
    cell: (row) => (
      <div className="text-xs">
        <p>C: {formatFailedDate(row.createdAt)}</p>
        <p className="text-muted-foreground">U: {formatFailedDate(row.updatedAt)}</p>
      </div>
    ),
  },
  {
    id: 'lastUpdate',
    header: 'Last Update',
    className: 'min-w-[160px]',
    cell: (row) => (
      <span className="text-xs text-muted-foreground">{row.lastUpdateNote ?? '—'}</span>
    ),
  },
  {
    id: 'address',
    header: 'Full Address',
    className: 'min-w-[220px]',
    cell: (row) => (
      <div className="text-sm">
        <p className="font-medium">{row.customerName}</p>
        <p className="text-muted-foreground">{row.address}</p>
        <div className="mt-1 max-w-[200px]">
          <FormPhoneInput value={row.customerPhone} readOnly className="h-7 text-xs" />
        </div>
      </div>
    ),
  },
  {
    id: 'products',
    header: 'Order Items',
    className: 'min-w-[200px]',
    cell: (row) => (
      <ul className="list-disc pl-4 text-sm">
        {row.products.map((product) => (
          <li key={product}>{product}</li>
        ))}
      </ul>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => <EntityStatusBadge status={row.status} kind="order" />,
  },
  {
    id: 'action',
    header: 'Action',
    cell: () => (
      <Button
        type="button"
        size="sm"
        className="bg-teal-600 hover:bg-teal-700"
        onClick={() => toast.success('Order confirmed — moved to pipeline')}
      >
        <Check className="size-4" />
        Confirm
      </Button>
    ),
  },
];

type FailedOrdersTableProps = {
  rows: FailedOrderListItem[];
};

export function FailedOrdersTable({ rows }: FailedOrdersTableProps) {
  return (
    <DataTable
      columns={FAILED_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      emptyMessage="No failed orders in this view."
      className="min-w-[900px]"
    />
  );
}
