'use client';

import * as React from 'react';
import type { LeadListItem } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import {
  buildLeadTableColumns,
  LEAD_TABLE_PINNED,
} from '@/features/leads/components/lead-list/lead-table-columns';
import { LeadTableMobileCard } from '@/features/leads/components/lead-list/lead-table-mobile-card';

type LeadDataTableProps = {
  rows: LeadListItem[];
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
  onNoteClick?: (row: LeadListItem) => void;
  onConvertClick?: (row: LeadListItem) => void;
};

export function LeadDataTable({
  rows,
  selectedIds,
  onSelectionChange,
  emptyMessage = 'No leads found for this view.',
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
  onNoteClick,
  onConvertClick,
}: LeadDataTableProps) {
  const columns = React.useMemo(
    () => buildLeadTableColumns({ onNoteClick, onConvertClick }),
    [onNoteClick, onConvertClick],
  );

  const mobileCard = React.useCallback(
    (row: LeadListItem, ctx: Parameters<typeof LeadTableMobileCard>[0]['ctx']) => (
      <LeadTableMobileCard
        row={row}
        ctx={ctx}
        onNoteClick={onNoteClick}
        onConvertClick={onConvertClick}
      />
    ),
    [onNoteClick, onConvertClick],
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
      minTableWidth={960}
      pinnedColumns={LEAD_TABLE_PINNED}
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
    />
  );
}
