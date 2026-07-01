'use client';

import * as React from 'react';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnPinningState,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
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

const coreRowModel = getCoreRowModel();
const sortedRowModel = getSortedRowModel();

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

function visibilityStateEqual(a: VisibilityState, b: VisibilityState): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((key) => a[key] === b[key]);
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

  const [manualVisibility, setManualVisibility] = React.useState<VisibilityState>({});
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});

  const responsiveVisibility = React.useMemo(
    () => (isTablet && !isMobile ? buildTabletVisibility(columns) : {}),
    [columns, isMobile, isTablet],
  );

  const columnVisibility = React.useMemo(
    () => ({ ...responsiveVisibility, ...manualVisibility }),
    [responsiveVisibility, manualVisibility],
  );

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

  const selectedIds = selection?.selectedIds;
  const rowSelection = React.useMemo<RowSelectionState>(() => {
    if (!selectedIds || selectedIds.size === 0) {
      return {};
    }
    const state: RowSelectionState = {};
    for (const id of selectedIds) {
      state[id] = true;
    }
    return state;
  }, [selectedIds]);

  const columnPinning = React.useMemo(
    () => buildColumnPinning(pinnedColumns, enableRowSelection),
    [pinnedColumns, enableRowSelection],
  );

  const sorting = React.useMemo(
    () => sortingStateFromCrm(sort),
    [sort?.id, sort?.desc],
  );

  const pagination = React.useMemo(
    () => ({
      pageIndex: Math.max(0, (page ?? 1) - 1),
      pageSize: pageSize ?? 10,
    }),
    [page, pageSize],
  );

  const isControlledSorting = manualSorting || Boolean(onSortChange);
  const isControlledPagination = manualPagination || Boolean(total);

  const handleSortingChange = React.useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      if (!onSortChange) {
        return;
      }
      const next =
        typeof updater === 'function' ? updater(sortingStateFromCrm(sort)) : updater;
      onSortChange(crmSortFromSortingState(next));
    },
    [onSortChange, sort],
  );

  const handleColumnVisibilityChange = React.useCallback<OnChangeFn<VisibilityState>>(
    (updater) => {
      setManualVisibility((prev) => {
        const merged = { ...responsiveVisibility, ...prev };
        const next = typeof updater === 'function' ? updater(merged) : updater;
        const manualOnly: VisibilityState = {};
        for (const [key, value] of Object.entries(next)) {
          if (responsiveVisibility[key] !== value) {
            manualOnly[key] = value;
          }
        }
        return visibilityStateEqual(prev, manualOnly) ? prev : manualOnly;
      });
    },
    [responsiveVisibility],
  );

  const onSelectionChange = selection?.onChange;

  const handleRowSelectionChange = React.useCallback<OnChangeFn<RowSelectionState>>(
    (updater) => {
      if (!onSelectionChange) {
        return;
      }
      const next =
        typeof updater === 'function' ? updater(rowSelection) : updater;
      onSelectionChange(new Set(Object.keys(next).filter((key) => next[key])));
    },
    [onSelectionChange, rowSelection],
  );

  const tableState = React.useMemo(
    () => ({
      ...(isControlledSorting ? { sorting } : {}),
      columnVisibility,
      columnPinning,
      ...(enableRowSelection ? { rowSelection } : {}),
      ...(isControlledPagination ? { pagination } : {}),
    }),
    [
      columnPinning,
      columnVisibility,
      enableRowSelection,
      isControlledPagination,
      isControlledSorting,
      pagination,
      rowSelection,
      sorting,
    ],
  );

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
    state: tableState,
    enableRowSelection,
    manualPagination,
    manualSorting,
    pageCount: total && pageSize ? Math.ceil(total / pageSize) : undefined,
    onSortingChange: isControlledSorting ? handleSortingChange : undefined,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: enableRowSelection ? handleRowSelectionChange : undefined,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: manualSorting ? undefined : sortedRowModel,
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
    setColumnVisibility: setManualVisibility,
    hiddenOnTablet,
  };
}
