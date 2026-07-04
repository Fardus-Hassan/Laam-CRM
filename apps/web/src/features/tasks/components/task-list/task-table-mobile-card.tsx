'use client';

import Link from 'next/link';
import type { TaskListItem, TaskPriority, TaskStatus } from '@laam/types';
import {
  CalendarClock,
  CheckCircle2,
  MessageCircle,
  MessageSquare,
  MessageSquarePlus,
  Phone,
} from 'lucide-react';

import type { CrmRowContext } from '@/components/data-table';
import { DataTableCopyableText } from '@/components/data-table/cells';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormSelect } from '@/components/form/form-select';
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from '@/features/tasks/config/task-filters';
import { TaskPriorityBadge, TaskStatusBadge } from '@/features/tasks/components/shared/task-badges';
import { formatTaskDate } from '@/features/tasks/components/task-list/task-table-columns';

type TaskTableMobileCardProps = {
  row: TaskListItem;
  ctx: CrmRowContext<TaskListItem>;
  onStatusChange?: (row: TaskListItem, status: TaskStatus) => void;
  onPriorityChange?: (row: TaskListItem, priority: TaskPriority) => void;
  onDueDateChange?: (row: TaskListItem, date: string) => void;
  onNoteClick?: (row: TaskListItem) => void;
  onMarkDone?: (row: TaskListItem) => void;
  onDetailsClick?: (row: TaskListItem) => void;
};

const STATUS_OPTIONS = (Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((value) => ({
  value,
  label: TASK_STATUS_LABELS[value],
}));

const PRIORITY_OPTIONS = (Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((value) => ({
  value,
  label: TASK_PRIORITY_LABELS[value],
}));

export function TaskTableMobileCard({
  row,
  ctx,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  onNoteClick,
  onMarkDone,
  onDetailsClick,
}: TaskTableMobileCardProps) {
  const phoneDigits = row.customerPhone?.replace(/\D/g, '') ?? '';

  return (
    <div className="divide-y divide-border/60">
      <header className="flex items-start gap-3 p-4">
        <Checkbox
          checked={ctx.isSelected}
          onCheckedChange={(value) => ctx.toggleSelected(Boolean(value))}
          aria-label={`Select ${row.title}`}
          className="mt-1"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <TaskPriorityBadge priority={row.priority} />
            <TaskStatusBadge status={row.status} />
          </div>
          <button
            type="button"
            className="text-left text-base font-semibold text-primary hover:underline"
            onClick={() => onDetailsClick?.(row)}
          >
            {row.title}
          </button>
          <p className="text-xs text-muted-foreground">{TASK_TYPE_LABELS[row.taskType]}</p>
          {row.customerName ? (
            <p className="text-sm font-medium">{row.customerName}</p>
          ) : null}
          {row.customerPhone ? (
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="outline" className="h-7 px-2" asChild>
                <a href={`tel:${phoneDigits}`}>
                  <Phone className="size-3.5" />
                </a>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => {
                  window.open(`https://wa.me/${phoneDigits}`, '_blank', 'noopener,noreferrer');
                }}
              >
                <MessageCircle className="size-3.5" />
              </Button>
              <DataTableCopyableText value={row.customerPhone} className="text-xs" />
            </div>
          ) : null}
        </div>
      </header>

      <div className="space-y-3 px-4 py-3">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Due date</p>
          <input
            type="date"
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={row.dueDate ?? ''}
            onChange={(e) => onDueDateChange?.(row, e.target.value)}
          />
          {row.dueTime ? (
            <p className="mt-1 text-[10px] text-muted-foreground">{row.dueTime}</p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Status</p>
            <FormSelect
              value={row.status}
              onChange={(value) => onStatusChange?.(row, value as TaskStatus)}
              options={STATUS_OPTIONS}
              searchable={false}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Priority</p>
            <FormSelect
              value={row.priority}
              onChange={(value) => onPriorityChange?.(row, value as TaskPriority)}
              options={PRIORITY_OPTIONS}
              searchable={false}
            />
          </div>
        </div>
        {row.relatedLabel && row.relatedType !== 'none' ? (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Linked to</p>
            <p className="text-sm">{row.relatedLabel}</p>
          </div>
        ) : null}
        {row.assignedAgentName ? (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Assigned</p>
            <p className="text-sm">{row.assignedAgentName}</p>
          </div>
        ) : null}
        <p className="text-[10px] text-muted-foreground">
          Created {formatTaskDate(row.createdAt)}
        </p>
      </div>

      <footer className="flex flex-wrap gap-2 px-4 py-3">
        {row.status !== 'done' ? (
          <Button
            type="button"
            size="sm"
            className="h-7"
            onClick={() => onMarkDone?.(row)}
          >
            <CheckCircle2 className="size-3.5" />
            Mark done
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => onDetailsClick?.(row)}
        >
          <CalendarClock className="size-3.5" />
          Details
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => onNoteClick?.(row)}
        >
          {row.hasNotes ? (
            <MessageSquare className="size-3.5 text-primary" />
          ) : (
            <MessageSquarePlus className="size-3.5 text-muted-foreground" />
          )}
        </Button>
        {row.relatedType === 'order' && row.relatedId ? (
          <Button type="button" size="sm" variant="ghost" className="h-7" asChild>
            <Link href={`/dashboard/orders/${row.relatedId}`}>View order</Link>
          </Button>
        ) : null}
      </footer>
    </div>
  );
}
