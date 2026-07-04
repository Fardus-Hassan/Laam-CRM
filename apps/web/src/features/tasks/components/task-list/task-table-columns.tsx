'use client';

import Link from 'next/link';
import type { TaskListItem, TaskPriority, TaskStatus } from '@laam/types';
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  MessageSquarePlus,
  Phone,
} from 'lucide-react';

import type { CrmColumnDef } from '@/components/data-table';
import {
  DataTableCopyableText,
  DataTableDateTime,
  DataTableEmptyValue,
  TruncatedText,
} from '@/components/data-table/cells';
import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/form/form-select';
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from '@/features/tasks/config/task-filters';
import { TaskStatusBadge } from '@/features/tasks/components/shared/task-badges';

export const TASK_TABLE_PINNED = {
  left: ['select', 'sl'],
  right: [] as string[],
};

export function formatTaskDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function relatedHref(row: TaskListItem): string | null {
  if (row.relatedType === 'order' && row.relatedId) {
    return `/dashboard/orders/${row.relatedId}`;
  }
  if (row.relatedType === 'lead' && row.relatedId) {
    return `/dashboard/leads/${row.relatedId}`;
  }
  if (row.relatedType === 'customer' && row.relatedId) {
    return `/dashboard/companies/${row.relatedId}`;
  }
  if (row.relatedType === 'followup' && row.relatedId) {
    return `/dashboard/followups`;
  }
  return null;
}

const STATUS_OPTIONS = (Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((value) => ({
  value,
  label: TASK_STATUS_LABELS[value],
}));

const PRIORITY_OPTIONS = (Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((value) => ({
  value,
  label: TASK_PRIORITY_LABELS[value],
}));

export function buildTaskTableColumns(options?: {
  rowOffset?: number;
  onStatusChange?: (row: TaskListItem, status: TaskStatus) => void;
  onPriorityChange?: (row: TaskListItem, priority: TaskPriority) => void;
  onDueDateChange?: (row: TaskListItem, date: string) => void;
  onNoteClick?: (row: TaskListItem) => void;
  onMarkDone?: (row: TaskListItem) => void;
  onDetailsClick?: (row: TaskListItem) => void;
}): CrmColumnDef<TaskListItem>[] {
  const rowOffset = options?.rowOffset ?? 0;

  return [
    {
      id: 'sl',
      header: 'SL',
      size: 44,
      meta: { label: 'SL', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{rowOffset + row.index + 1}</span>
      ),
    },
    {
      id: 'task',
      header: 'Task',
      size: 220,
      meta: { label: 'Task', priority: 'primary', align: 'top' },
      cell: ({ row }) => (
        <div className="space-y-1">
          <button
            type="button"
            className="text-left font-medium text-primary hover:underline"
            onClick={() => options?.onDetailsClick?.(row.original)}
          >
            {row.original.title}
          </button>
          <p className="text-[10px] text-muted-foreground">{TASK_TYPE_LABELS[row.original.taskType]}</p>
          {row.original.description ? (
            <TruncatedText className="text-xs text-muted-foreground">
              {row.original.description}
            </TruncatedText>
          ) : null}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      size: 120,
      meta: { label: 'Status', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <FormSelect
          value={row.original.status}
          onChange={(value) => options?.onStatusChange?.(row.original, value as TaskStatus)}
          options={STATUS_OPTIONS}
          searchable={false}
          className="h-8 min-w-[100px] text-xs"
        />
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      size: 100,
      meta: { label: 'Priority', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <FormSelect
          value={row.original.priority}
          onChange={(value) => options?.onPriorityChange?.(row.original, value as TaskPriority)}
          options={PRIORITY_OPTIONS}
          searchable={false}
          className="h-8 min-w-[88px] text-xs"
        />
      ),
    },
    {
      id: 'due',
      header: 'Due',
      size: 130,
      meta: { label: 'Due date', priority: 'primary', align: 'top' },
      cell: ({ row }) => (
        <div className="space-y-1">
          <input
            type="date"
            className="flex h-8 w-full min-w-[110px] rounded-md border border-input bg-background px-2 text-xs"
            value={row.original.dueDate ?? ''}
            onChange={(e) => options?.onDueDateChange?.(row.original, e.target.value)}
          />
          {row.original.dueTime ? (
            <p className="text-[10px] text-muted-foreground">{row.original.dueTime}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      size: 150,
      meta: { label: 'Customer', priority: 'secondary', align: 'top' },
      cell: ({ row }) =>
        row.original.customerName ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{row.original.customerName}</p>
            {row.original.customerPhone ? (
              <div className="flex items-center gap-1">
                <DataTableCopyableText value={row.original.customerPhone} className="text-xs" />
                <Button type="button" size="sm" variant="outline" className="h-6 px-1.5" asChild>
                  <a href={`tel:${row.original.customerPhone.replace(/\D/g, '')}`}>
                    <Phone className="size-3" />
                  </a>
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'related',
      header: 'Linked to',
      size: 120,
      meta: { label: 'Related', priority: 'secondary', align: 'middle' },
      cell: ({ row }) => {
        const href = relatedHref(row.original);
        if (!row.original.relatedLabel || row.original.relatedType === 'none') {
          return <DataTableEmptyValue />;
        }
        return href ? (
          <Link href={href} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            {row.original.relatedLabel}
            <ExternalLink className="size-3" />
          </Link>
        ) : (
          <span className="text-xs">{row.original.relatedLabel}</span>
        );
      },
    },
    {
      id: 'assigned',
      header: 'Assigned',
      size: 110,
      meta: { label: 'Assigned', priority: 'secondary', align: 'middle' },
      cell: ({ row }) => (
        <span className="text-xs">{row.original.assignedAgentName ?? '—'}</span>
      ),
    },
    {
      id: 'notes',
      header: () => (
        <span className="flex flex-col items-center gap-0 leading-tight">
          <span>Task</span>
          <span>Notes</span>
        </span>
      ),
      size: 64,
      meta: {
        label: 'Notes',
        priority: 'secondary',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        align: 'middle',
      },
      cell: ({ row }) => (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => options?.onNoteClick?.(row.original)}
        >
          {row.original.hasNotes ? (
            <MessageSquare className="size-3.5 text-primary" />
          ) : (
            <MessageSquarePlus className="size-3.5 text-muted-foreground" />
          )}
        </Button>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 100,
      meta: { label: 'Actions', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          {row.original.status !== 'done' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => options?.onMarkDone?.(row.original)}
            >
              <CheckCircle2 className="size-3" />
              Done
            </Button>
          ) : (
            <TaskStatusBadge status="done" />
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => options?.onDetailsClick?.(row.original)}
          >
            <CalendarClock className="size-3" />
            Details
          </Button>
        </div>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      size: 100,
      meta: { label: 'Created', priority: 'hidden-mobile', align: 'middle' },
      cell: ({ row }) => (
        <DataTableDateTime value={row.original.createdAt} formatter={formatTaskDate} />
      ),
    },
  ];
}
