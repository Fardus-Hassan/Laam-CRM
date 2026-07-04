'use client';

import type { AgentRankRow, SuperAdminUserRow } from '@laam/types';

import { formatCurrency } from '@/lib/format';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const USER_COLUMNS: DataTableColumn<SuperAdminUserRow>[] = [
  {
    id: 'user',
    header: 'User',
    className: 'min-w-[180px]',
    cell: (row) => (
      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">{initials(row.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.email}</p>
        </div>
      </div>
    ),
  },
  {
    id: 'role',
    header: 'Role',
    cell: (row) => <span className="text-sm">{row.role}</span>,
  },
  {
    id: 'organization',
    header: 'Organization',
    className: 'min-w-[120px]',
    cell: (row) => <span className="truncate text-sm">{row.organization}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => (
      <Badge variant={row.status === 'active' ? 'success' : 'danger'}>
        {row.status === 'active' ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

const AGENT_COLUMNS: DataTableColumn<AgentRankRow>[] = [
  {
    id: 'rank',
    header: '#',
    className: 'w-10',
    cell: (row) => (
      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {row.rank}
      </span>
    ),
  },
  {
    id: 'agent',
    header: 'Agent',
    className: 'min-w-[140px]',
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
    id: 'orders',
    header: 'Orders',
    cell: (row) => row.orders.toLocaleString('en-BD'),
  },
  {
    id: 'revenue',
    header: 'Revenue',
    cell: (row) => formatCurrency(row.revenue, { compact: true }),
  },
  {
    id: 'score',
    header: 'Score',
    cell: (row) => (
      <span className="font-semibold text-primary">{row.score}</span>
    ),
  },
];

type RecentUsersTableProps = {
  rows: SuperAdminUserRow[];
};

export function RecentUsersTable({ rows }: RecentUsersTableProps) {
  return (
    <DataTable
      columns={USER_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      className="min-w-[520px]"
    />
  );
}

type TopAgentsTableProps = {
  rows: AgentRankRow[];
};

export function TopAgentsTable({ rows }: TopAgentsTableProps) {
  return (
    <DataTable
      columns={AGENT_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      className="min-w-[480px]"
    />
  );
}
