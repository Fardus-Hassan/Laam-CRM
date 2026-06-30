'use client';

import * as React from 'react';
import type { ReactNode } from 'react';

import {
  CrmDataTable,
  type CrmColumnDef,
} from '@/components/data-table';

/**
 * @deprecated Use `CrmColumnDef` from `@/components/data-table` directly.
 */
export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  align?: 'top' | 'middle';
  enableSorting?: boolean;
  priority?: 'primary' | 'secondary' | 'hidden-mobile';
  label?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  className?: string;
  tableClassName?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  showToolbar?: boolean;
};

export function legacyColumnsToCrm<T>(columns: DataTableColumn<T>[]): CrmColumnDef<T>[] {
  return columns.map(
    (column) =>
      ({
        id: column.id,
        header: column.header,
        enableSorting: column.enableSorting,
        cell: ({ row }) => column.cell(row.original),
        meta: {
          label:
            column.label ??
            (typeof column.header === 'string' ? column.header : column.id),
          priority: column.priority ?? 'primary',
          headerClassName: column.headerClassName ?? column.className,
          cellClassName: column.cellClassName ?? column.className,
          align: column.align,
        },
      }) as CrmColumnDef<T>,
  );
}

/**
 * @deprecated Use `CrmDataTable` from `@/components/data-table`.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  className,
  tableClassName,
  emptyMessage,
  isLoading,
  showToolbar = false,
}: DataTableProps<T>) {
  return (
    <CrmDataTable
      columns={legacyColumnsToCrm(columns)}
      data={rows}
      getRowId={getRowId}
      className={className}
      tableClassName={tableClassName}
      emptyMessage={emptyMessage}
      isLoading={isLoading}
      showToolbar={showToolbar}
      manualPagination={false}
      manualSorting={false}
    />
  );
}

export { CrmDataTableSkeleton as DataTableEmptyState } from '@/components/data-table/crm-data-table-skeleton';
