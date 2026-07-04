'use client';

import * as React from 'react';
import type { FailedOrderListItem } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import { buildFailedOrderTableColumns } from '@/features/orders/components/failed-orders/failed-order-table-columns';

type FailedOrderDataTableProps = {
  rows: FailedOrderListItem[];
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onRetry?: (row: FailedOrderListItem) => void;
  onDismiss?: (row: FailedOrderListItem) => void;
};

export function FailedOrderDataTable({
  rows,
  isLoading,
  page = 1,
  pageSize = 10,
  total,
  onPageChange,
  onRetry,
  onDismiss,
}: FailedOrderDataTableProps) {
  const columns = React.useMemo(
    () => buildFailedOrderTableColumns({ onRetry, onDismiss }),
    [onRetry, onDismiss],
  );

  return (
    <CrmDataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      emptyMessage="No failed orders in this view."
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      showToolbar={false}
      minTableWidth={900}
    />
  );
}
