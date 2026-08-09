'use client';

import * as React from 'react';
import type { TaskListItem, TaskPriority, TaskStatus } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import {
  buildTaskTableColumns,
  TASK_TABLE_PINNED,
} from '@/features/tasks/components/task-list/task-table-columns';
import { TaskTableMobileCard } from '@/features/tasks/components/task-list/task-table-mobile-card';

type TaskDataTableProps = {
  rows: TaskListItem[];
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
  onStatusChange?: (row: TaskListItem, status: TaskStatus) => void;
  onPriorityChange?: (row: TaskListItem, priority: TaskPriority) => void;
  onDueDateChange?: (row: TaskListItem, date: string) => void;
  onNoteClick?: (row: TaskListItem) => void;
  onMarkDone?: (row: TaskListItem) => void;
  onDetailsClick?: (row: TaskListItem) => void;
};

export function TaskDataTable({
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
  onPriorityChange,
  onDueDateChange,
  onNoteClick,
  onMarkDone,
  onDetailsClick,
}: TaskDataTableProps) {
  const columns = React.useMemo(
    () =>
      buildTaskTableColumns({
        rowOffset,
        onStatusChange,
        onPriorityChange,
        onDueDateChange,
        onNoteClick,
        onMarkDone,
        onDetailsClick,
      }),
    [
      rowOffset,
      onStatusChange,
      onPriorityChange,
      onDueDateChange,
      onNoteClick,
      onMarkDone,
      onDetailsClick,
    ],
  );

  const mobileCard = React.useCallback(
    (row: TaskListItem, ctx: Parameters<typeof TaskTableMobileCard>[0]['ctx']) => (
      <TaskTableMobileCard
        row={row}
        ctx={ctx}
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
        onDueDateChange={onDueDateChange}
        onNoteClick={onNoteClick}
        onMarkDone={onMarkDone}
        onDetailsClick={onDetailsClick}
      />
    ),
    [
      onStatusChange,
      onPriorityChange,
      onDueDateChange,
      onNoteClick,
      onMarkDone,
      onDetailsClick,
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
      emptyMessage="No tasks in this view."
      isLoading={isLoading}
      minTableWidth={1200}
      pinnedColumns={TASK_TABLE_PINNED}
      mobileCard={mobileCard}
      selection={selectionState}
      density="compact"
      entityLabel="tasks"
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
