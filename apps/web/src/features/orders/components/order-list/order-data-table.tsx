'use client';

import * as React from 'react';
import type { OrderListRow } from '@laam/types';

import { CrmDataTable, CrmDataTableToolbar } from '@/components/data-table';
import {
  ORDER_TABLE_COLUMNS,
  ORDER_TABLE_PINNED,
} from '@/features/orders/components/order-list/order-table-columns';
import { OrderTableMobileCard } from '@/features/orders/components/order-list/order-table-mobile-card';

type OrderDataTableProps = {
  rows: OrderListRow[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPagination?: boolean;
  sort?: { id: string; desc: boolean } | null;
  onSortChange?: (sort: { id: string; desc: boolean } | null) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
};

export function OrderDataTable({
  rows,
  selectedIds,
  onSelectionChange,
  emptyMessage = 'No orders found for this view.',
  isLoading,
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  showPagination,
  sort,
  onSortChange,
  search,
  onSearchChange,
}: OrderDataTableProps) {
  const selectionState = React.useMemo(
    () => ({ selectedIds, onChange: onSelectionChange }),
    [selectedIds, onSelectionChange],
  );

  return (
    <CrmDataTable
      columns={ORDER_TABLE_COLUMNS}
      data={rows}
      getRowId={(row) => row.id}
      emptyMessage={emptyMessage}
      isLoading={isLoading}
      minTableWidth={1280}
      pinnedColumns={ORDER_TABLE_PINNED}
      mobileCard={OrderTableMobileCard}
      selection={selectionState}
      density="compact"
      page={page}
      pageSize={pageSize}
      total={total}
      pageSizeOptions={pageSizeOptions}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      showPagination={showPagination}
      sort={sort}
      onSortChange={onSortChange}
      showToolbar={false}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search orders…"
      headerSlot={(table) => (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <h3 className="shrink-0 text-sm font-semibold">Order List</h3>
          <CrmDataTableToolbar
            table={table}
            embedded
            className="min-w-0"
            search={search}
            onSearchChange={onSearchChange}
            searchPlaceholder="Search orders…"
          />
        </div>
      )}
    />
  );
}
