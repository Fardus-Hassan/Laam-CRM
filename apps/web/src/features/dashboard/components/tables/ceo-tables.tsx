'use client';

import type { CeoDepartmentRow, CeoTeamRow } from '@laam/types';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { formatCurrency, formatPercent } from '@/lib/format';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { TableProgressCell } from '@/components/dashboard/table-progress-cell';
import { StarRating } from '@/components/dashboard/star-rating';
import { cn } from '@/lib/utils';

function GrowthCell({ value, trend }: { value: number; trend: CeoDepartmentRow['trend'] }) {
  const Icon =
    trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-sm font-medium',
        trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
        trend === 'down' && 'text-red-600 dark:text-red-400',
        trend === 'neutral' && 'text-muted-foreground',
      )}
    >
      <Icon className="size-3.5" />
      {formatPercent(value)}
    </span>
  );
}

const DEPARTMENT_COLUMNS: DataTableColumn<CeoDepartmentRow>[] = [
  {
    id: 'department',
    header: 'Department',
    className: 'min-w-[120px]',
    cell: (row) => <span className="font-medium">{row.department}</span>,
  },
  {
    id: 'revenue',
    header: 'Revenue',
    cell: (row) => formatCurrency(row.revenue, { compact: true }),
  },
  {
    id: 'target',
    header: 'Target',
    cell: (row) => formatCurrency(row.target, { compact: true }),
  },
  {
    id: 'achievement',
    header: 'Achievement',
    cell: (row) => <TableProgressCell value={row.achievementPercent} />,
  },
  {
    id: 'growth',
    header: 'Growth',
    cell: (row) => <GrowthCell value={row.growthPercent} trend={row.trend} />,
  },
];

const TEAM_COLUMNS: DataTableColumn<CeoTeamRow>[] = [
  {
    id: 'team',
    header: 'Team',
    className: 'min-w-[120px]',
    cell: (row) => <span className="font-medium">{row.team}</span>,
  },
  {
    id: 'revenue',
    header: 'Revenue',
    cell: (row) => formatCurrency(row.revenue, { compact: true }),
  },
  {
    id: 'orders',
    header: 'Orders',
    cell: (row) => row.orders.toLocaleString('en-BD'),
  },
  {
    id: 'achievement',
    header: 'Achievement',
    cell: (row) => <TableProgressCell value={row.achievementPercent} />,
  },
  {
    id: 'rating',
    header: 'Rating',
    cell: (row) => <StarRating rating={row.rating} />,
  },
];

type CeoDepartmentTableProps = {
  rows: CeoDepartmentRow[];
};

export function CeoDepartmentTable({ rows }: CeoDepartmentTableProps) {
  return (
    <DataTable
      columns={DEPARTMENT_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      className="min-w-[520px]"
    />
  );
}

type CeoTopTeamsTableProps = {
  rows: CeoTeamRow[];
};

export function CeoTopTeamsTable({ rows }: CeoTopTeamsTableProps) {
  return (
    <DataTable
      columns={TEAM_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      className="min-w-[480px]"
    />
  );
}
