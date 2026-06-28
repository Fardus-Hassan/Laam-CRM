'use client';

import Link from 'next/link';
import type { OrderListItem } from '@laam/types';
import { Eye, MoreHorizontal, Phone, UserRound } from 'lucide-react';

import { Can } from '@/components/auth/can';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { formatCurrency } from '@/lib/format';

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

const PAYMENT_LABELS = {
  cod: 'COD',
  paid: 'Paid',
  partial: 'Partial',
  refunded: 'Refunded',
} as const;

const ORDER_COLUMNS: DataTableColumn<OrderListItem>[] = [
  {
    id: 'orderNumber',
    header: 'Order ID',
    className: 'min-w-[110px]',
    cell: (row) => (
      <Link
        href={`/dashboard/orders/${row.orderNumber}`}
        className="font-medium text-primary hover:underline"
      >
        {row.orderNumber}
      </Link>
    ),
  },
  {
    id: 'customer',
    header: 'Customer',
    className: 'min-w-[150px]',
    cell: (row) => (
      <div>
        <p className="font-medium">{row.customerName}</p>
        <p className="text-xs text-muted-foreground">{row.customerPhone}</p>
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => <StatusBadge status={row.status} kind="order" />,
  },
  {
    id: 'source',
    header: 'Source',
    cell: (row) => ORDER_SOURCE_LABELS[row.source],
  },
  {
    id: 'items',
    header: 'Items',
    cell: (row) => row.itemsCount,
  },
  {
    id: 'amount',
    header: 'Amount',
    cell: (row) => formatCurrency(row.amount),
  },
  {
    id: 'payment',
    header: 'Payment',
    cell: (row) => PAYMENT_LABELS[row.paymentStatus],
  },
  {
    id: 'area',
    header: 'Area',
    className: 'min-w-[100px]',
    cell: (row) => row.shippingArea,
  },
  {
    id: 'agent',
    header: 'Agent',
    className: 'min-w-[120px]',
    cell: (row) => row.assignedAgentName ?? '—',
  },
  {
    id: 'date',
    header: 'Date',
    cell: (row) => formatOrderDate(row.createdAt),
  },
  {
    id: 'actions',
    header: '',
    className: 'w-12',
    cell: (row) => <OrderRowActions order={row} />,
  },
];

type OrdersTableProps = {
  rows: OrderListItem[];
  emptyMessage?: string;
};

export function OrdersTable({
  rows,
  emptyMessage = 'No orders found for this view.',
}: OrdersTableProps) {
  return (
    <DataTable
      columns={ORDER_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      emptyMessage={emptyMessage}
      className="min-w-[1100px]"
    />
  );
}

function OrderRowActions({ order }: { order: OrderListItem }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="size-8" aria-label="Order actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/orders/${order.orderNumber}`}>
            <Eye className="size-4" />
            View details
          </Link>
        </DropdownMenuItem>
        <Can permission="orders.confirm">
          <DropdownMenuItem disabled={order.status !== 'pending'}>
            Confirm order
          </DropdownMenuItem>
        </Can>
        <Can permission="orders.cancel">
          <DropdownMenuItem disabled={order.status === 'delivered'}>
            Cancel order
          </DropdownMenuItem>
        </Can>
        <Can permission="orders.assign">
          <DropdownMenuItem>
            <UserRound className="size-4" />
            Reassign agent
          </DropdownMenuItem>
        </Can>
        <DropdownMenuItem>
          <Phone className="size-4" />
          Call customer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
