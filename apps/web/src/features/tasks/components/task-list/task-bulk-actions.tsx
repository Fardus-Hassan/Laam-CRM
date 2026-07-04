'use client';

import * as React from 'react';
import type { TaskListItem } from '@laam/types';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  bulkActionToModal,
  runTaskBulkAction,
  TaskBulkModals,
} from '@/features/tasks/components/task-list/modals/task-bulk-modals';
import {
  TASK_BULK_ACTIONS,
  type TaskBulkActionId,
} from '@/features/tasks/config/task-bulk-actions';
import { useTaskMutations } from '@/features/tasks/hooks/use-task-mutations';
import { cn } from '@/lib/utils';

type TaskBulkActionsProps = {
  selectedCount: number;
  selectedTaskIds: string[];
  selectedRows: TaskListItem[];
  onSuccess?: () => void;
  className?: string;
};

export function TaskBulkActions({
  selectedCount,
  selectedTaskIds,
  selectedRows,
  onSuccess,
  className,
}: TaskBulkActionsProps) {
  const { bulkAction, isLoading } = useTaskMutations();
  const [bulkModal, setBulkModal] = React.useState<ReturnType<typeof bulkActionToModal>>(null);

  function handleAction(actionId: TaskBulkActionId) {
    runTaskBulkAction(actionId, selectedTaskIds, {
      openModal: setBulkModal,
      bulkAction: async (payload) => {
        await bulkAction(payload);
        onSuccess?.();
      },
      exportRows: () => {
        if (selectedRows.length === 0) {
          toast.error('No rows to export');
          return;
        }
        const header = 'Title,Type,Status,Priority,Due,Customer,Phone,Assigned,Related\n';
        const body = selectedRows
          .map((row) =>
            [
              `"${row.title}"`,
              row.taskType,
              row.status,
              row.priority,
              row.dueDate ?? '',
              `"${row.customerName ?? ''}"`,
              row.customerPhone ?? '',
              row.assignedAgentName ?? '',
              `"${row.relatedLabel ?? ''}"`,
            ].join(','),
          )
          .join('\n');
        const blob = new Blob([header + body], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `tasks-export-${Date.now()}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${selectedRows.length} task(s)`);
        onSuccess?.();
      },
    });
  }

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {TASK_BULK_ACTIONS.map((action) => (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant={
              action.variant === 'destructive'
                ? 'destructive'
                : action.variant === 'secondary'
                  ? 'secondary'
                  : 'outline'
            }
            disabled={(action.requiresSelection && selectedCount === 0) || isLoading}
            onClick={() => handleAction(action.id)}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <TaskBulkModals
        state={bulkModal}
        onClose={() => setBulkModal(null)}
        onSuccess={onSuccess}
      />
    </>
  );
}
