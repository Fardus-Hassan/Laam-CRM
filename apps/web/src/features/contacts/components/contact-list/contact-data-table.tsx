'use client';

import * as React from 'react';
import type { ContactListItem } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import {
  buildContactTableColumns,
  CONTACT_TABLE_PINNED,
} from '@/features/contacts/components/contact-list/contact-table-columns';
import { ContactTableMobileCard } from '@/features/contacts/components/contact-list/contact-table-mobile-card';

type ContactDataTableProps = {
  rows: ContactListItem[];
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
  onNoteClick?: (row: ContactListItem) => void;
  onFollowUpClick?: (row: ContactListItem) => void;
};

export function ContactDataTable({
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
}: ContactDataTableProps) {
  const columns = React.useMemo(
    () => buildContactTableColumns({ onNoteClick, onFollowUpClick }),
    [onNoteClick, onFollowUpClick],
  );

  const mobileCard = React.useCallback(
    (row: ContactListItem, ctx: Parameters<typeof ContactTableMobileCard>[0]['ctx']) => (
      <ContactTableMobileCard
        row={row}
        ctx={ctx}
        onNoteClick={onNoteClick}
        onFollowUpClick={onFollowUpClick}
      />
    ),
    [onNoteClick, onFollowUpClick],
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
      emptyMessage="No contacts found for this view."
      isLoading={isLoading}
      minTableWidth={1080}
      pinnedColumns={CONTACT_TABLE_PINNED}
      mobileCard={mobileCard}
      selection={selectionState}
      density="compact"
      entityLabel="contacts"
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
