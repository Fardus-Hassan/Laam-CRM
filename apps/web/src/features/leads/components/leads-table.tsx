'use client';

import Link from 'next/link';
import type { LeadListItem } from '@laam/types';
import { Eye, MoreHorizontal, Phone, UserRound } from 'lucide-react';

import { Can } from '@/components/auth/can';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { EntityStatusBadge } from '@/components/dashboard/entity-status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LEAD_SOURCE_LABELS } from '@/features/leads/config/lead-filters';
import { formatCurrency } from '@/lib/format';

function formatLeadDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

const LEAD_COLUMNS: DataTableColumn<LeadListItem>[] = [
  {
    id: 'leadNumber',
    header: 'Lead ID',
    className: 'min-w-[100px]',
    cell: (row) => (
      <Link
        href={`/dashboard/leads/${row.leadNumber}`}
        className="font-medium text-primary hover:underline"
      >
        {row.leadNumber}
      </Link>
    ),
  },
  {
    id: 'name',
    header: 'Name',
    className: 'min-w-[150px]',
    cell: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground">{row.phone}</p>
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => <EntityStatusBadge status={row.status} kind="lead" />,
  },
  {
    id: 'source',
    header: 'Source',
    cell: (row) => LEAD_SOURCE_LABELS[row.source],
  },
  {
    id: 'campaign',
    header: 'Campaign',
    className: 'min-w-[120px]',
    cell: (row) => row.campaignName ?? '—',
  },
  {
    id: 'value',
    header: 'Est. Value',
    cell: (row) => (row.estimatedValue ? formatCurrency(row.estimatedValue) : '—'),
  },
  {
    id: 'area',
    header: 'Area',
    cell: (row) => row.area ?? '—',
  },
  {
    id: 'agent',
    header: 'Agent',
    className: 'min-w-[120px]',
    cell: (row) => row.assignedAgentName ?? 'Unassigned',
  },
  {
    id: 'date',
    header: 'Created',
    cell: (row) => formatLeadDate(row.createdAt),
  },
  {
    id: 'actions',
    header: '',
    className: 'w-12',
    cell: (row) => <LeadRowActions lead={row} />,
  },
];

type LeadsTableProps = {
  rows: LeadListItem[];
  emptyMessage?: string;
};

export function LeadsTable({
  rows,
  emptyMessage = 'No leads found for this view.',
}: LeadsTableProps) {
  return (
    <DataTable
      columns={LEAD_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      emptyMessage={emptyMessage}
      className="min-w-[1100px]"
    />
  );
}

function LeadRowActions({ lead }: { lead: LeadListItem }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="size-8" aria-label="Lead actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/leads/${lead.leadNumber}`}>
            <Eye className="size-4" />
            View details
          </Link>
        </DropdownMenuItem>
        <Can permission="leads.assign">
          <DropdownMenuItem>
            <UserRound className="size-4" />
            Assign agent
          </DropdownMenuItem>
        </Can>
        <Can permission="leads.convert">
          <DropdownMenuItem disabled={lead.status === 'converted'}>
            Convert to order
          </DropdownMenuItem>
        </Can>
        <DropdownMenuItem>
          <Phone className="size-4" />
          Call lead
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
