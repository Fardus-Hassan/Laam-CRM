'use client';

import * as React from 'react';
import type { InventoryProductListItem, ProductStatus } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import {
  buildProductTableColumns,
  PRODUCT_TABLE_PINNED,
} from '@/features/inventory/components/product-list/product-table-columns';
import { ProductTableMobileCard } from '@/features/inventory/components/product-list/product-table-mobile-card';

type ProductDataTableProps = {
  rows: InventoryProductListItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPagination?: boolean;
  rowOffset?: number;
  onStatusChange?: (row: InventoryProductListItem, status: ProductStatus) => void;
  onStockAdjust?: (row: InventoryProductListItem, delta: number) => void;
  onDetailsClick?: (row: InventoryProductListItem) => void;
};

export function ProductDataTable({
  rows,
  selectedIds,
  onSelectionChange,
  isLoading,
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  showPagination,
  rowOffset,
  onStatusChange,
  onStockAdjust,
  onDetailsClick,
}: ProductDataTableProps) {
  const columns = React.useMemo(
    () =>
      buildProductTableColumns({
        rowOffset,
        onStatusChange,
        onStockAdjust,
        onDetailsClick,
      }),
    [rowOffset, onStatusChange, onStockAdjust, onDetailsClick],
  );

  const mobileCard = React.useCallback(
    (
      row: InventoryProductListItem,
      ctx: Parameters<typeof ProductTableMobileCard>[0]['ctx'],
    ) => (
      <ProductTableMobileCard
        row={row}
        ctx={ctx}
        onStatusChange={onStatusChange}
        onStockAdjust={onStockAdjust}
        onDetailsClick={onDetailsClick}
      />
    ),
    [onStatusChange, onStockAdjust, onDetailsClick],
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
      emptyMessage="No products in this view."
      isLoading={isLoading}
      minTableWidth={1100}
      pinnedColumns={PRODUCT_TABLE_PINNED}
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
      showToolbar={false}
    />
  );
}
