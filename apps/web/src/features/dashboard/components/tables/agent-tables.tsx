'use client';

import Link from 'next/link';
import type {
  AgentOrderRow,
  FollowUpRow,
  IncentiveHistoryRow,
} from '@laam/types';
import { Eye, MessageSquare, Phone } from 'lucide-react';

import { formatCurrency } from '@/lib/format';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';

const ORDER_COLUMNS: DataTableColumn<AgentOrderRow>[] = [
  {
    id: 'orderId',
    header: 'Order ID',
    className: 'min-w-[100px]',
    cell: (row) => (
      <Link
        href={`/dashboard/orders/${row.orderId}`}
        className="font-medium text-primary hover:underline"
      >
        {row.orderId}
      </Link>
    ),
  },
  {
    id: 'customerName',
    header: 'Customer Name',
    className: 'min-w-[140px]',
    cell: (row) => row.customerName,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => <StatusBadge status={row.status} kind="order" />,
  },
  {
    id: 'amount',
    header: 'Amount (৳)',
    cell: (row) => formatCurrency(row.amount),
  },
  {
    id: 'date',
    header: 'Date',
    cell: (row) => row.date,
  },
  {
    id: 'action',
    header: '',
    className: 'w-10',
    cell: (row) => (
      <Button variant="ghost" size="icon-sm" className="size-8" asChild>
        <Link href={`/dashboard/orders/${row.orderId}`} aria-label={`View ${row.orderId}`}>
          <Eye className="size-4" />
        </Link>
      </Button>
    ),
  },
];

const FOLLOW_UP_COLUMNS: DataTableColumn<FollowUpRow>[] = [
  {
    id: 'customerName',
    header: 'Customer Name',
    className: 'min-w-[140px]',
    cell: (row) => row.customerName,
  },
  {
    id: 'phone',
    header: 'Phone',
    className: 'min-w-[130px] whitespace-nowrap',
    cell: (row) => row.phone,
  },
  {
    id: 'lastFollowUp',
    header: 'Last Follow Up',
    cell: (row) => row.lastFollowUp,
  },
  {
    id: 'nextFollowUp',
    header: 'Next Follow Up',
    cell: (row) => row.nextFollowUp,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => <StatusBadge status={row.status} kind="follow_up" />,
  },
  {
    id: 'action',
    header: '',
    className: 'w-20',
    cell: (row) => (
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8"
          aria-label={`Call ${row.customerName}`}
        >
          <Phone className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8"
          aria-label={`Message ${row.customerName}`}
        >
          <MessageSquare className="size-4" />
        </Button>
      </div>
    ),
  },
];

const INCENTIVE_HISTORY_COLUMNS: DataTableColumn<IncentiveHistoryRow>[] = [
  {
    id: 'date',
    header: 'Date',
    className: 'min-w-[100px] whitespace-nowrap',
    cell: (row) => row.date,
  },
  {
    id: 'description',
    header: 'Description',
    className: 'min-w-[160px]',
    cell: (row) => row.description,
  },
  {
    id: 'type',
    header: 'Type',
    cell: (row) => row.type,
  },
  {
    id: 'amount',
    header: 'Amount',
    cell: (row) => (
      <span className="font-medium text-primary">{formatCurrency(row.amount)}</span>
    ),
  },
];

type AgentOrdersTableProps = {
  rows: AgentOrderRow[];
  className?: string;
};

export function AgentOrdersTable({ rows, className }: AgentOrdersTableProps) {
  return (
    <DataTable
      columns={ORDER_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      className={className}
    />
  );
}

type FollowUpsTableProps = {
  rows: FollowUpRow[];
  className?: string;
};

export function FollowUpsTable({ rows, className }: FollowUpsTableProps) {
  return (
    <DataTable
      columns={FOLLOW_UP_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      className={className}
    />
  );
}

type IncentiveHistoryTableProps = {
  rows: IncentiveHistoryRow[];
  className?: string;
};

export function IncentiveHistoryTable({
  rows,
  className,
}: IncentiveHistoryTableProps) {
  return (
    <DataTable
      columns={INCENTIVE_HISTORY_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      className={className}
    />
  );
}
