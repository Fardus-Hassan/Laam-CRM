'use client';

import * as React from 'react';
import type { LedgerEntry } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import { buildTransactionTableColumns } from '@/features/accounting/components/transaction-list/transaction-table-columns';

type TransactionDataTableProps = {
  rows: LedgerEntry[];
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPagination?: boolean;
  rowOffset?: number;
  showType?: boolean;
};

export function TransactionDataTable({
  rows,
  isLoading,
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  showPagination,
  rowOffset,
  showType,
}: TransactionDataTableProps) {
  const columns = React.useMemo(
    () => buildTransactionTableColumns({ rowOffset, showType }),
    [rowOffset, showType],
  );

  return (
    <CrmDataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      emptyMessage="No transactions in this view."
      isLoading={isLoading}
      minTableWidth={900}
      density="compact"
      entityLabel="transactions"
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
