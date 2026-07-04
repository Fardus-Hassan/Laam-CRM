import type { ColumnDef, Row, SortingState, Table } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export type ColumnPriority = 'primary' | 'secondary' | 'hidden-mobile';

export type CrmColumnMeta = {
  label?: string;
  priority?: ColumnPriority;
  headerClassName?: string;
  cellClassName?: string;
  align?: 'top' | 'middle' | 'center';
};

export type CrmColumnDef<T> = ColumnDef<T, unknown> & {
  meta?: CrmColumnMeta;
};

export type CrmSortState = {
  id: string;
  desc: boolean;
};

export type CrmRowContext<T> = {
  row: Row<T>;
  table: Table<T>;
  isSelected: boolean;
  toggleSelected: (value?: boolean) => void;
};

export type CrmSelectionState = {
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
};

export type CrmPinnedColumns = {
  left?: string[];
  right?: string[];
};

export type CrmDataTableDensity = 'comfortable' | 'compact';

export type CrmDataTableProps<T> = {
  columns: CrmColumnDef<T>[];
  data: T[];
  getRowId: (row: T) => string;
  className?: string;
  tableClassName?: string;
  emptyMessage?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  sort?: CrmSortState | null;
  onSortChange?: (sort: CrmSortState | null) => void;
  selection?: CrmSelectionState;
  enableRowSelection?: boolean;
  isLoading?: boolean;
  showToolbar?: boolean;
  showPagination?: boolean;
  mobileCard?: (row: T, ctx: CrmRowContext<T>) => ReactNode;
  pinnedColumns?: CrmPinnedColumns;
  density?: CrmDataTableDensity;
  minTableWidth?: number | string;
  manualPagination?: boolean;
  manualSorting?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  headerSlot?: (table: Table<T>) => ReactNode;
};

export function sortingStateFromCrm(sort: CrmSortState | null | undefined): SortingState {
  if (!sort) {
    return [];
  }
  return [{ id: sort.id, desc: sort.desc }];
}

export function crmSortFromSortingState(state: SortingState): CrmSortState | null {
  const first = state[0];
  if (!first) {
    return null;
  }
  return { id: first.id, desc: first.desc };
}
