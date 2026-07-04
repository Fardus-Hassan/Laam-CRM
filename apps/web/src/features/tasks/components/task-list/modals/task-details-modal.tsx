'use client';

import Link from 'next/link';
import type { TaskDetail } from '@laam/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TASK_TYPE_LABELS,
} from '@/features/tasks/config/task-filters';
import { TaskPriorityBadge, TaskStatusBadge } from '@/features/tasks/components/shared/task-badges';
import { formatTaskDate } from '@/features/tasks/components/task-list/task-table-columns';

type TaskDetailsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskDetail | null;
};

export function TaskDetailsModal({ open, onOpenChange, task }: TaskDetailsModalProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{TASK_TYPE_LABELS[task.taskType]}</Badge>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
          </div>
          {task.description ? (
            <p className="text-muted-foreground">{task.description}</p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Due</p>
              <p className="font-medium">
                {task.dueDate ? `${task.dueDate}${task.dueTime ? ` ${task.dueTime}` : ''}` : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assigned</p>
              <p className="font-medium">{task.assignedAgentName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="font-medium">{task.customerName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mobile</p>
              <p className="font-medium">{task.customerPhone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Linked to</p>
              <p className="font-medium">{task.relatedLabel ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium">{formatTaskDate(task.createdAt)}</p>
            </div>
          </div>
          {task.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
          {task.notes ? (
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1">{task.notes}</p>
            </div>
          ) : null}
          {task.activities.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Activity</p>
              <ol className="space-y-2">
                {task.activities.map((a) => (
                  <li key={a.id} className="rounded-md border border-border/60 p-2">
                    <p className="font-medium">{a.label}</p>
                    {a.actorName ? (
                      <p className="text-xs text-muted-foreground">by {a.actorName}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          {task.relatedType === 'order' && task.relatedId ? (
            <Button type="button" variant="outline" asChild>
              <Link href={`/dashboard/orders/${task.relatedId}`}>View order</Link>
            </Button>
          ) : null}
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
