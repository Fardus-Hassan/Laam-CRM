'use client';

import * as React from 'react';
import type { OrderListRow } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import {
  buildOrderTableColumns,
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
  onNoteClick?: (row: OrderListRow) => void;
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
  onNoteClick,
}: OrderDataTableProps) {
  const columns = React.useMemo(
    () => buildOrderTableColumns({ onNoteClick }),
    [onNoteClick],
  );

  const mobileCard = React.useCallback(
    (row: OrderListRow, ctx: Parameters<typeof OrderTableMobileCard>[0]['ctx']) => (
      <OrderTableMobileCard row={row} ctx={ctx} onNoteClick={onNoteClick} />
    ),
    [onNoteClick],
  );

  const selectionState = React.useMemo(
    () => ({ selectedIds, onChange: onSelectionChange }),
    [selectedIds, onSelectionChange],
  );

  return (
    <CrmDataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      emptyMessage={emptyMessage}
      isLoading={isLoading}
      minTableWidth={1280}
      pinnedColumns={ORDER_TABLE_PINNED}
      mobileCard={mobileCard}
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
      headerSlot={() => (
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="text-sm font-semibold">Orders</h3>
        </div>
      )}
    />
  );
}
