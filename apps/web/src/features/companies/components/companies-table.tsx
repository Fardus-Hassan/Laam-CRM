'use client';

import Link from 'next/link';
import type { CompanyListItem } from '@laam/types';
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

const COLUMNS: DataTableColumn<CompanyListItem>[] = [
  {
    id: 'name',
    header: 'Customer',
    cell: (row) => (
      <Link href={`/dashboard/companies/${row.id}`} className="font-medium text-primary hover:underline">
        {row.name}
      </Link>
    ),
  },
  { id: 'phone', header: 'Mobile', cell: (row) => row.phone ?? '—' },
  { id: 'industry', header: 'Area', cell: (row) => row.industry ?? '—' },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => <EntityStatusBadge status={row.status} kind="company" />,
  },
  { id: 'contacts', header: 'Orders', cell: (row) => row.contactCount },
  { id: 'dealValue', header: 'Total spent', cell: (row) => formatCurrency(row.dealValue) },
  { id: 'city', header: 'District', cell: (row) => row.city ?? '—' },
  { id: 'agent', header: 'Agent', cell: (row) => row.assignedAgentName ?? '—' },
  {
    id: 'actions',
    header: '',
    className: 'w-12',
    cell: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="size-8" aria-label="Customer actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/companies/${row.id}`}>
              <Eye className="size-4" />
              View details
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function CompaniesTable({ rows }: { rows: CompanyListItem[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      emptyMessage="No customers found."
      className="min-w-[820px]"
    />
  );
}
