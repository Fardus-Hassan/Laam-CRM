'use client';

import * as React from 'react';
import { Inbox } from 'lucide-react';

import { CrmDataTableDesktop } from '@/components/data-table/crm-data-table-desktop';
import { CrmDataTableMeta } from '@/components/data-table/crm-data-table-meta';
import { CrmDataTablePagination } from '@/components/data-table/crm-data-table-pagination';
import { CrmDataTableSkeleton } from '@/components/data-table/crm-data-table-skeleton';
import { CrmDataTableToolbar } from '@/components/data-table/crm-data-table-toolbar';
import type { CrmDataTableProps } from '@/components/data-table/crm-data-table-types';
import { useCrmDataTable } from '@/components/data-table/use-crm-data-table';
import { cn } from '@/lib/utils';

export function CrmDataTable<T>({
  columns,
  data,
  getRowId,
  className,
  tableClassName,
  emptyMessage = 'No data available',
  page = 1,
  pageSize = 10,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  sort,
  onSortChange,
  selection,
  enableRowSelection,
  isLoading = false,
  showToolbar = true,
  showPagination = false,
  showMeta = true,
  entityLabel = 'entries',
  pinnedColumns,
  density: densityProp = 'comfortable',
  minTableWidth,
  manualPagination = true,
  manualSorting = true,
  search,
  onSearchChange,
  searchPlaceholder,
  headerSlot,
  getRowClassName,
  getRowTitle,
}: CrmDataTableProps<T>) {
  const density = densityProp;

  const { table, isTablet, expandedRows, toggleRowExpanded, hiddenOnTablet } = useCrmDataTable({
    columns,
    data,
    getRowId,
    sort,
    onSortChange,
    selection,
    enableRowSelection: enableRowSelection ?? Boolean(selection),
    pinnedColumns,
    manualPagination,
    manualSorting,
    page,
    pageSize,
    total,
  });

  const resolvedTotal = total ?? data.length;
  const selectedCount = selection?.selectedIds.size ?? 0;

  const metaBar =
    showMeta && !isLoading ? (
      <CrmDataTableMeta
        page={page}
        pageSize={pageSize}
        total={resolvedTotal}
        entityLabel={entityLabel}
        selectedCount={selectedCount}
        onClearSelection={
          selectedCount > 0 && selection
            ? () => selection.onChange(new Set())
            : undefined
        }
        onPageSizeChange={
          showPagination && onPageSizeChange ? onPageSizeChange : undefined
        }
        pageSizeOptions={pageSizeOptions}
      />
    ) : null;

  // No overflow-hidden — it breaks page-level sticky header/footer.
  const rootClass = cn('flex min-w-0 max-w-full flex-col', className);

  if (isLoading) {
    return (
      <div className={rootClass}>
        {headerSlot ? headerSlot(table) : null}
        <CrmDataTableSkeleton />
      </div>
    );
  }

  const toolbar = headerSlot
    ? headerSlot(table)
    : showToolbar
      ? (
          <CrmDataTableToolbar
            table={table}
            search={search}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
          />
        )
      : null;

  if (data.length === 0) {
    return (
      <div className={rootClass}>
        {toolbar}
        {metaBar}
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
        {showPagination && onPageSizeChange ? (
          <CrmDataTablePagination
            page={page}
            pageSize={pageSize}
            total={resolvedTotal}
            pageSizeOptions={pageSizeOptions}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            showRangeSummary={false}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={rootClass}>
      {toolbar}

      <CrmDataTableDesktop
        table={table}
        density={density}
        minTableWidth={minTableWidth}
        isTablet={isTablet}
        expandedRows={expandedRows}
        onToggleExpanded={toggleRowExpanded}
        hiddenOnTablet={hiddenOnTablet}
        className={tableClassName}
        stickyTopSlot={metaBar}
        getRowClassName={getRowClassName}
        getRowTitle={getRowTitle}
      />

      {showPagination && resolvedTotal > 0 ? (
        <CrmDataTablePagination
          page={page}
          pageSize={pageSize}
          total={resolvedTotal}
          pageSizeOptions={pageSizeOptions}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          showRangeSummary={false}
          sticky
        />
      ) : null}
    </div>
  );
}

export type {
  CrmColumnDef,
  CrmColumnMeta,
  CrmDataTableProps,
  CrmRowContext,
  CrmSelectionState,
  CrmSortState,
} from '@/components/data-table/crm-data-table-types';
