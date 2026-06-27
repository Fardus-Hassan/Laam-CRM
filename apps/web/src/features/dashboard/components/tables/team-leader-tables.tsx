'use client';

import type { TeamAgentPerformanceRow } from '@laam/types';
import { Eye, MessageSquare } from 'lucide-react';

import { formatCurrency } from '@/lib/format';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { PresenceBadge } from '@/components/dashboard/presence-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const AGENT_COLUMNS: DataTableColumn<TeamAgentPerformanceRow>[] = [
  {
    id: 'agent',
    header: 'Agent Name',
    className: 'min-w-[160px]',
    cell: (row) => (
      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">{initials(row.name)}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-medium">{row.name}</span>
      </div>
    ),
  },
  {
    id: 'assigned',
    header: 'Assigned',
    cell: (row) => row.assigned.toLocaleString('en-BD'),
  },
  {
    id: 'confirmed',
    header: 'Confirmed',
    cell: (row) => row.confirmed.toLocaleString('en-BD'),
  },
  {
    id: 'delivered',
    header: 'Delivered',
    cell: (row) => row.delivered.toLocaleString('en-BD'),
  },
  {
    id: 'cancelled',
    header: 'Cancelled',
    cell: (row) => row.cancelled.toLocaleString('en-BD'),
  },
  {
    id: 'held',
    header: 'Held',
    cell: (row) => row.held.toLocaleString('en-BD'),
  },
  {
    id: 'followUps',
    header: 'Follow Ups',
    cell: (row) => row.followUps.toLocaleString('en-BD'),
  },
  {
    id: 'score',
    header: 'Score',
    cell: (row) => row.score.toLocaleString('en-BD'),
  },
  {
    id: 'incentive',
    header: 'Incentive',
    cell: (row) => formatCurrency(row.incentive, { compact: true }),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => <PresenceBadge presence={row.presence} />,
  },
  {
    id: 'action',
    header: '',
    className: 'w-20',
    cell: () => (
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="size-8">
          <Eye className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8">
          <MessageSquare className="size-4" />
        </Button>
      </div>
    ),
  },
];

type TeamAgentsTableProps = {
  rows: TeamAgentPerformanceRow[];
};

export function TeamAgentsTable({ rows }: TeamAgentsTableProps) {
  return (
    <DataTable
      columns={AGENT_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      className="min-w-[960px]"
    />
  );
}
