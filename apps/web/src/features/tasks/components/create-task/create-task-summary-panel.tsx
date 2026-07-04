'use client';

import type { TaskPriority, TaskType } from '@laam/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { TaskPriorityBadge, TaskStatusBadge } from '@/features/tasks/components/shared/task-badges';
import { TASK_TYPE_LABELS } from '@/features/tasks/config/task-filters';

type CreateTaskSummaryPanelProps = {
  draft: {
    title: string;
    taskType: TaskType;
    priority: TaskPriority;
    dueDate: string;
    dueTime: string;
    assignedAgentName: string;
    customerName: string;
    customerPhone: string;
    notes: string;
  };
};

export function CreateTaskSummaryPanel({ draft }: CreateTaskSummaryPanelProps) {
  return (
    <Card className={ORDER_CARD_CLASS}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Preview</CardTitle>
      </CardHeader>
      <CardContent className={ORDER_SECTION_BODY_CLASS}>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <TaskStatusBadge status="pending" />
            <TaskPriorityBadge priority={draft.priority} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Title</p>
            <p className="font-medium">{draft.title.trim() || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p>{TASK_TYPE_LABELS[draft.taskType]}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due</p>
            <p>
              {draft.dueDate
                ? `${draft.dueDate}${draft.dueTime ? ` at ${draft.dueTime}` : ''}`
                : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Assigned</p>
            <p>{draft.assignedAgentName || '—'}</p>
          </div>
          {(draft.customerName || draft.customerPhone) && (
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <p>{draft.customerName || '—'}</p>
              {draft.customerPhone ? (
                <p className="text-xs text-muted-foreground">{draft.customerPhone}</p>
              ) : null}
            </div>
          )}
          {draft.notes.trim() ? (
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-xs">{draft.notes.trim()}</p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
