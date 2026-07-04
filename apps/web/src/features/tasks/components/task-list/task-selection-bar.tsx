'use client';

import type { TaskListItem } from '@laam/types';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TaskBulkActions } from '@/features/tasks/components/task-list/task-bulk-actions';
import { cn } from '@/lib/utils';

type TaskSelectionBarProps = {
  selectedCount: number;
  selectedTaskIds: string[];
  selectedRows: TaskListItem[];
  onClearSelection: () => void;
  onSuccess?: () => void;
  className?: string;
};

export function TaskSelectionBar({
  selectedCount,
  selectedTaskIds,
  selectedRows,
  onClearSelection,
  onSuccess,
  className,
}: TaskSelectionBarProps) {
  if (selectedCount === 0) return null;

  const overdue = selectedRows.filter(
    (r) => r.dueDate && r.status !== 'done' && r.status !== 'cancelled',
  ).length;
  const urgent = selectedRows.filter((r) => r.priority === 'urgent').length;

  return (
    <div className={cn('border-b border-border/70 bg-muted/25 px-4 py-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">
          {selectedCount} task{selectedCount === 1 ? '' : 's'} selected
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onClearSelection}
        >
          <X className="size-3.5" />
          Clear
        </Button>
      </div>
      <div className="mt-2.5">
        <TaskBulkActions
          selectedCount={selectedCount}
          selectedTaskIds={selectedTaskIds}
          selectedRows={selectedRows}
          onSuccess={onSuccess}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
        <span className="font-medium text-muted-foreground">Selection summary</span>
        <span>
          With due date <strong className="tabular-nums text-foreground">{overdue}</strong>
        </span>
        <span>
          Urgent <strong className="tabular-nums text-foreground">{urgent}</strong>
        </span>
      </div>
    </div>
  );
}
