'use client';

import * as React from 'react';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnPinningState,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';

import type {
  CrmColumnDef,
  CrmDataTableProps,
  CrmPinnedColumns,
} from '@/components/data-table/crm-data-table-types';
import {
  crmSortFromSortingState,
  sortingStateFromCrm,
} from '@/components/data-table/crm-data-table-types';
import { Checkbox, type CheckedState } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-media-query';

function buildColumnPinning(
  pinned: CrmPinnedColumns | undefined,
  hasSelection: boolean,
): ColumnPinningState {
  const left = [...(pinned?.left ?? [])];
  if (hasSelection && !left.includes('__select')) {
    left.unshift('__select');
  }
  return {
    left,
    right: pinned?.right ?? [],
  };
}

function buildTabletVisibility<T>(columns: CrmColumnDef<T>[]): VisibilityState {
  const visibility: VisibilityState = {};
  for (const column of columns) {
    const id = column.id ?? (column as { accessorKey?: string }).accessorKey;
    if (!id || id === '__select' || id === '__expand') {
      continue;
    }
    const priority = column.meta?.priority ?? 'primary';
    if (priority === 'hidden-mobile' || priority === 'secondary') {
      visibility[id] = false;
    }
  }
  return visibility;
}

function buildSelectionColumn<T>(): CrmColumnDef<T> {
  return {
    id: '__select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
        }
        onCheckedChange={(value: CheckedState) =>
          table.toggleAllPageRowsSelected(value === true)
        }
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: CheckedState) => row.toggleSelected(value === true)}
        aria-label={`Select row ${row.id}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
    minSize: 40,
    maxSize: 40,
    meta: {
      align: 'middle',
      headerClassName: 'w-10',
      cellClassName: 'w-10',
    },
  };
}

function buildExpandColumn<T>(): CrmColumnDef<T> {
  return {
    id: '__expand',
    header: '',
    cell: () => null,
    enableSorting: false,
    enableHiding: false,
    size: 40,
    minSize: 40,
    maxSize: 40,
    meta: {
      align: 'middle',
      headerClassName: 'w-10',
      cellClassName: 'w-10',
    },
  };
}

export function useCrmDataTable<T>({
  columns,
  data,
  getRowId,
  sort,
  onSortChange,
  selection,
  enableRowSelection = Boolean(selection),
  pinnedColumns,
  manualPagination = true,
  manualSorting = true,
  page,
  pageSize,
  total,
}: Pick<
  CrmDataTableProps<T>,
  | 'columns'
  | 'data'
  | 'getRowId'
  | 'sort'
  | 'onSortChange'
  | 'selection'
  | 'enableRowSelection'
  | 'pinnedColumns'
  | 'manualPagination'
  | 'manualSorting'
  | 'page'
  | 'pageSize'
  | 'total'
>) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});

  const resolvedColumns = React.useMemo(() => {
    const next: ColumnDef<T, unknown>[] = [...columns];
    if (enableRowSelection) {
      next.unshift(buildSelectionColumn<T>());
    }
    if (isTablet && !isMobile) {
      next.splice(enableRowSelection ? 1 : 0, 0, buildExpandColumn<T>());
    }
    return next;
  }, [columns, enableRowSelection, isMobile, isTablet]);

  React.useEffect(() => {
    if (isTablet && !isMobile) {
      setColumnVisibility(buildTabletVisibility(columns));
    } else if (!isTablet) {
      setColumnVisibility({});
    }
  }, [columns, isMobile, isTablet]);

  const rowSelection = React.useMemo<RowSelectionState>(() => {
    if (!selection) {
      return {};
    }
    const state: RowSelectionState = {};
    for (const id of selection.selectedIds) {
      state[id] = true;
    }
    return state;
  }, [selection]);

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    getRowId: (row) => getRowId(row),
    defaultColumn: {
      minSize: 48,
      size: 140,
      maxSize: 400,
    },
    enableColumnPinning: true,
    state: {
      sorting: sortingStateFromCrm(sort),
      columnVisibility,
      columnPinning: buildColumnPinning(pinnedColumns, enableRowSelection),
      rowSelection,
      pagination: {
        pageIndex: Math.max(0, (page ?? 1) - 1),
        pageSize: pageSize ?? 10,
      },
    },
    enableRowSelection,
    manualPagination,
    manualSorting,
    pageCount: total && pageSize ? Math.ceil(total / pageSize) : undefined,
    onSortingChange: (updater) => {
      if (!onSortChange) {
        return;
      }
      const next =
        typeof updater === 'function'
          ? updater(sortingStateFromCrm(sort))
          : updater;
      onSortChange(crmSortFromSortingState(next));
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      if (!selection) {
        return;
      }
      const next =
        typeof updater === 'function' ? updater(rowSelection) : updater;
      selection.onChange(new Set(Object.keys(next).filter((key) => next[key])));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
  });

  function toggleRowExpanded(rowId: string) {
    setExpandedRows((current) => ({
      ...current,
      [rowId]: !current[rowId],
    }));
  }

  const hiddenOnTablet = table
    .getAllColumns()
    .filter((col) => !col.getIsVisible() && col.id !== '__select' && col.id !== '__expand')
    .map((col) => col.id);

  return {
    table,
    isMobile,
    isTablet,
    expandedRows,
    toggleRowExpanded,
    columnVisibility,
    setColumnVisibility,
    hiddenOnTablet,
  };
}
