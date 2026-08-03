'use client';

import * as React from 'react';
import type { FollowupListItem } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import {
  buildFollowupTableColumns,
  FOLLOWUP_TABLE_PINNED,
} from '@/features/followups/components/followup-list/followup-table-columns';
import { FollowupTableMobileCard } from '@/features/followups/components/followup-list/followup-table-mobile-card';
import type { FollowupStatus } from '@laam/types';

type FollowupDataTableProps = {
  rows: FollowupListItem[];
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
  onScheduleChange?: (row: FollowupListItem, date: string) => void;
  onSkip?: (row: FollowupListItem) => void;
  onFollowupNoteClick?: (row: FollowupListItem) => void;
  onCustomerNoteClick?: (row: FollowupListItem) => void;
  onDetailsClick?: (row: FollowupListItem) => void;
  onStatusChange?: (row: FollowupListItem, status: FollowupStatus) => void;
  onTagChange?: (row: FollowupListItem, tag: string) => void;
};

export function FollowupDataTable({
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
  onScheduleChange,
  onSkip,
  onFollowupNoteClick,
  onCustomerNoteClick,
  onDetailsClick,
  onStatusChange,
  onTagChange,
}: FollowupDataTableProps) {
  const columns = React.useMemo(
    () =>
      buildFollowupTableColumns({
        rowOffset,
        onScheduleChange,
        onSkip,
        onFollowupNoteClick,
        onCustomerNoteClick,
        onDetailsClick,
        onStatusChange,
        onTagChange,
      }),
    [
      rowOffset,
      onScheduleChange,
      onSkip,
      onFollowupNoteClick,
      onCustomerNoteClick,
      onDetailsClick,
      onStatusChange,
      onTagChange,
    ],
  );

  const mobileCard = React.useCallback(
    (row: FollowupListItem, ctx: Parameters<typeof FollowupTableMobileCard>[0]['ctx']) => (
      <FollowupTableMobileCard
        row={row}
        ctx={ctx}
        onScheduleChange={onScheduleChange}
        onSkip={onSkip}
        onFollowupNoteClick={onFollowupNoteClick}
        onCustomerNoteClick={onCustomerNoteClick}
        onDetailsClick={onDetailsClick}
        onStatusChange={onStatusChange}
      />
    ),
    [
      onScheduleChange,
      onSkip,
      onFollowupNoteClick,
      onCustomerNoteClick,
      onDetailsClick,
      onStatusChange,
    ],
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
      emptyMessage="No follow-ups in this view."
      isLoading={isLoading}
      minTableWidth={1280}
      pinnedColumns={FOLLOWUP_TABLE_PINNED}
      mobileCard={mobileCard}
      selection={selectionState}
      density="compact"
      entityLabel="follow-ups"
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
