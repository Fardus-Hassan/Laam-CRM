'use client';

import type { TaskPriority, TaskStatus } from '@laam/types';

import { Badge } from '@/components/ui/badge';
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from '@/features/tasks/config/task-filters';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<TaskStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  in_progress: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  cancelled: 'bg-muted text-muted-foreground',
};

const PRIORITY_VARIANT: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  urgent: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export function TaskStatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn('text-[10px] font-medium', STATUS_VARIANT[status], className)}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

export function TaskPriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn('text-[10px] font-medium', PRIORITY_VARIANT[priority], className)}>
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
