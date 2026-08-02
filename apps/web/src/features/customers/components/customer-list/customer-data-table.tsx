'use client';

import * as React from 'react';
import type { CustomerListItem, CustomerSegmentCount, CustomerStatus } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import {
  buildCustomerTableColumns,
  CUSTOMER_TABLE_PINNED,
} from '@/features/customers/components/customer-list/customer-table-columns';
import { CustomerTableMobileCard } from '@/features/customers/components/customer-list/customer-table-mobile-card';

type CustomerDataTableProps = {
  rows: CustomerListItem[];
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
  onNoteClick?: (row: CustomerListItem) => void;
  onFollowUpClick?: (row: CustomerListItem) => void;
  statusOptions?: CustomerSegmentCount[];
  onStatusChange?: (row: CustomerListItem, status: CustomerStatus) => void | Promise<void>;
};

export function CustomerDataTable({
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
  onNoteClick,
  onFollowUpClick,
  statusOptions = [],
  onStatusChange,
}: CustomerDataTableProps) {
  const columns = React.useMemo(
    () =>
      buildCustomerTableColumns({
        onNoteClick,
        onFollowUpClick,
        statusOptions,
        onStatusChange,
      }),
    [onNoteClick, onFollowUpClick, statusOptions, onStatusChange],
  );

  const mobileCard = React.useCallback(
    (row: CustomerListItem, ctx: Parameters<typeof CustomerTableMobileCard>[0]['ctx']) => (
      <CustomerTableMobileCard
        row={row}
        ctx={ctx}
        onNoteClick={onNoteClick}
        onFollowUpClick={onFollowUpClick}
        statusOptions={statusOptions}
        onStatusChange={onStatusChange}
      />
    ),
    [onNoteClick, onFollowUpClick, statusOptions, onStatusChange],
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
      emptyMessage="No customers found for this view."
      isLoading={isLoading}
      minTableWidth={1080}
      pinnedColumns={CUSTOMER_TABLE_PINNED}
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
