'use client';

import type {
  DepartmentTargetRow,
  TeamPerformanceRow,
} from '@laam/types';

import { Eye } from 'lucide-react';

import { formatCurrency } from '@/lib/format';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { TableProgressCell } from '@/components/dashboard/table-progress-cell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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

const TEAM_COLUMNS: DataTableColumn<TeamPerformanceRow>[] = [
  {
    id: 'team',
    header: 'Team / Leader',
    className: 'min-w-[200px]',
    cell: (row) => (
      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">{initials(row.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          {row.role ? (
            <p className="truncate text-xs text-muted-foreground">{row.role}</p>
          ) : null}
        </div>
      </div>
    ),
  },
  {
    id: 'totalOrders',
    header: 'Total Orders',
    cell: (row) => row.totalOrders.toLocaleString('en-BD'),
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
    id: 'revenue',
    header: 'Revenue (৳)',
    cell: (row) => formatCurrency(row.revenue, { compact: true }),
  },
  {
    id: 'achievement',
    header: 'Achievement',
    cell: (row) => <TableProgressCell value={row.achievementPercent} />,
  },
  {
    id: 'action',
    header: '',
    className: 'w-10',
    cell: () => (
      <Button variant="ghost" size="icon" className="size-8">
        <Eye className="size-4" />
      </Button>
    ),
  },
];

const STATUS_VARIANT: Record<
  DepartmentTargetRow['status'],
  'success' | 'default' | 'warning' | 'danger'
> = {
  excellent: 'success',
  on_track: 'default',
  at_risk: 'warning',
  behind: 'danger',
};

const STATUS_LABEL: Record<DepartmentTargetRow['status'], string> = {
  excellent: 'Excellent',
  on_track: 'On Track',
  at_risk: 'At Risk',
  behind: 'Behind',
};

const DEPARTMENT_COLUMNS: DataTableColumn<DepartmentTargetRow>[] = [
  {
    id: 'department',
    header: 'Department',
    cell: (row) => <span className="font-medium">{row.department}</span>,
  },
  {
    id: 'monthlyTarget',
    header: 'Monthly Target',
    cell: (row) => formatCurrency(row.monthlyTarget, { compact: true }),
  },
  {
    id: 'achieved',
    header: 'Achieved',
    cell: (row) => formatCurrency(row.achieved, { compact: true }),
  },
  {
    id: 'achievementPercent',
    header: 'Achievement %',
    cell: (row) => <TableProgressCell value={row.achievementPercent} />,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => (
      <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
    ),
  },
];

type TeamPerformanceTableProps = {
  rows: TeamPerformanceRow[];
};

export function TeamPerformanceTable({ rows }: TeamPerformanceTableProps) {
  return (
    <DataTable
      columns={TEAM_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      className="min-w-[720px]"
    />
  );
}

type DepartmentTargetsTableProps = {
  rows: DepartmentTargetRow[];
};

export function DepartmentTargetsTable({ rows }: DepartmentTargetsTableProps) {
  return (
    <DataTable
      columns={DEPARTMENT_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      className="min-w-[560px]"
    />
  );
}
