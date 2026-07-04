'use client';

import Link from 'next/link';
import type { DealListItem } from '@laam/types';
import { Eye, MoreHorizontal } from 'lucide-react';

import { EntityStatusBadge } from '@/components/dashboard/entity-status-badge';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/format';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

const COLUMNS: DataTableColumn<DealListItem>[] = [
  {
    id: 'dealNumber',
    header: 'Deal ID',
    cell: (row) => (
      <Link href={`/dashboard/deals/${row.dealNumber}`} className="font-medium text-primary hover:underline">
        {row.dealNumber}
      </Link>
    ),
  },
  { id: 'title', header: 'Title', className: 'min-w-[160px]', cell: (row) => row.title },
  { id: 'company', header: 'Customer', cell: (row) => row.companyName },
  { id: 'stage', header: 'Stage', cell: (row) => <EntityStatusBadge status={row.stage} kind="deal" /> },
  { id: 'amount', header: 'Amount', cell: (row) => formatCurrency(row.amount) },
  { id: 'probability', header: 'Probability', cell: (row) => `${row.probability}%` },
  { id: 'close', header: 'Expected close', cell: (row) => (row.expectedCloseDate ? formatDate(row.expectedCloseDate) : '—') },
  { id: 'agent', header: 'Agent', cell: (row) => row.assignedAgentName ?? '—' },
  {
    id: 'actions',
    header: '',
    className: 'w-12',
    cell: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="size-8" aria-label="Deal actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/deals/${row.dealNumber}`}>
              <Eye className="size-4" />
              View details
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function DealsTable({ rows }: { rows: DealListItem[] }) {
  return (
    <DataTable columns={COLUMNS} rows={rows} getRowId={(row) => row.id} emptyMessage="No deals found." className="min-w-[1000px]" />
  );
}
