'use client';

import * as React from 'react';
import type { OrderPaymentRecord } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import { buildPaymentTableColumns } from '@/features/orders/components/tools/payment-table-columns';

type PaymentDataTableProps = {
  rows: OrderPaymentRecord[];
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onReconcile?: (row: OrderPaymentRecord) => void;
};

export function PaymentDataTable({
  rows,
  isLoading,
  page = 1,
  pageSize = 20,
  total,
  onPageChange,
  onReconcile,
}: PaymentDataTableProps) {
  const columns = React.useMemo(
    () => buildPaymentTableColumns({ onReconcile }),
    [onReconcile],
  );

  return (
    <CrmDataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      emptyMessage="No payment records found."
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      showToolbar={false}
      minTableWidth={720}
    />
  );
}
