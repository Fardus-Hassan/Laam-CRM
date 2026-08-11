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
  onFollowUpSaved?: (orderId: string, followUpDueAt: string) => void;
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
  onFollowUpSaved,
}: OrderDataTableProps) {
  const columns = React.useMemo(
    () => buildOrderTableColumns({ onNoteClick, onFollowUpSaved }),
    [onNoteClick, onFollowUpSaved],
  );

  const mobileCard = React.useCallback(
    (row: OrderListRow, ctx: Parameters<typeof OrderTableMobileCard>[0]['ctx']) => (
      <OrderTableMobileCard
        row={row}
        ctx={ctx}
        onNoteClick={onNoteClick}
        onFollowUpSaved={onFollowUpSaved}
      />
    ),
    [onNoteClick, onFollowUpSaved],
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
      entityLabel="orders"
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
      getRowClassName={(row) =>
        row.courierSubmitFailed
          ? [
              'courier-submit-failed',
              'border-l-[3px] !border-l-[var(--brand-accent,#E8B931)]',
              'bg-[color-mix(in_oklab,var(--brand-accent,#E8B931)_14%,transparent)]',
              '[&_td]:!bg-[color-mix(in_oklab,var(--brand-accent,#E8B931)_14%,var(--card))]',
              'hover:[&_td]:!bg-[color-mix(in_oklab,var(--brand-accent,#E8B931)_22%,var(--card))]',
              'data-[state=selected]:[&_td]:!bg-[color-mix(in_oklab,var(--brand-accent,#E8B931)_18%,var(--card))]',
            ].join(' ')
          : undefined
      }
      getRowTitle={(row) =>
        row.courierSubmitFailed
          ? row.courierSubmitError
            ? `Courier submit failed: ${row.courierSubmitError}`
            : 'Courier submit failed'
          : undefined
      }
      headerSlot={() => (
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="text-sm font-semibold">Orders</h3>
        </div>
      )}
    />
  );
}
