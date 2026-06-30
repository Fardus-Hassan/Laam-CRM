'use client';

import * as React from 'react';
import { Inbox } from 'lucide-react';

import { CrmDataTableDesktop } from '@/components/data-table/crm-data-table-desktop';
import { CrmDataTableMobile } from '@/components/data-table/crm-data-table-mobile';
import { CrmDataTablePagination } from '@/components/data-table/crm-data-table-pagination';
import { CrmDataTableSkeleton } from '@/components/data-table/crm-data-table-skeleton';
import { CrmDataTableMobileSearch, CrmDataTableToolbar } from '@/components/data-table/crm-data-table-toolbar';
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
  mobileCard,
  pinnedColumns,
  density: densityProp = 'comfortable',
  minTableWidth,
  manualPagination = true,
  manualSorting = true,
  search,
  onSearchChange,
  searchPlaceholder,
  headerSlot,
}: CrmDataTableProps<T>) {
  const density = densityProp;

  const { table, isMobile, isTablet, expandedRows, toggleRowExpanded, hiddenOnTablet } =
    useCrmDataTable({
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

  if (isLoading) {
    return (
      <div className={cn('overflow-hidden rounded-lg', className)}>
        {headerSlot ? headerSlot(table) : null}
        <CrmDataTableSkeleton />
      </div>
    );
  }

  const toolbar = headerSlot
    ? headerSlot(table)
    : showToolbar && !isMobile
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
      <div className={cn('overflow-hidden rounded-lg', className)}>
        {toolbar}
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-14 text-center',
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const resolvedTotal = total ?? data.length;

  return (
    <div className={cn('overflow-hidden rounded-lg', className)}>
      {toolbar}

      {isMobile ? (
        <>
          {!headerSlot ? (
            <CrmDataTableMobileSearch
              search={search}
              onSearchChange={onSearchChange}
              searchPlaceholder={searchPlaceholder}
            />
          ) : null}
          <CrmDataTableMobile
            table={table}
            mobileCard={mobileCard}
            enableRowSelection={enableRowSelection ?? Boolean(selection)}
          />
        </>
      ) : (
        <CrmDataTableDesktop
          table={table}
          density={density}
          minTableWidth={minTableWidth}
          isTablet={isTablet}
          expandedRows={expandedRows}
          onToggleExpanded={toggleRowExpanded}
          hiddenOnTablet={hiddenOnTablet}
          className={tableClassName}
        />
      )}

      {showPagination && resolvedTotal > 0 ? (
        <CrmDataTablePagination
          page={page}
          pageSize={pageSize}
          total={resolvedTotal}
          pageSizeOptions={pageSizeOptions}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
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
