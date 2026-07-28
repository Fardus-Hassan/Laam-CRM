'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TaskBulkActionId } from '@/features/tasks/config/task-bulk-actions';
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from '@/features/tasks/config/task-filters';
import type { TasksApi } from '@/features/tasks/api/tasks-api';
import { useAgentOptions } from '@/features/rbac/hooks/use-agent-options';
import { useTaskMutations } from '@/features/tasks/hooks/use-task-mutations';
import type { TaskPriority, TaskStatus } from '@laam/types';

type TaskBulkModalState =
  | { type: 'assign'; taskIds: string[] }
  | { type: 'set_status'; taskIds: string[] }
  | { type: 'set_priority'; taskIds: string[] }
  | { type: 'change_due'; taskIds: string[] }
  | null;

export function bulkActionToModal(
  actionId: TaskBulkActionId,
  taskIds: string[],
): TaskBulkModalState {
  if (actionId === 'assign') return { type: 'assign', taskIds };
  if (actionId === 'set_status') return { type: 'set_status', taskIds };
  if (actionId === 'set_priority') return { type: 'set_priority', taskIds };
  if (actionId === 'change_due') return { type: 'change_due', taskIds };
  return null;
}

type TaskBulkModalsProps = {
  state: TaskBulkModalState;
  onClose: () => void;
  onSuccess?: () => void;
};

const STATUS_OPTIONS = (Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((value) => ({
  value,
  label: TASK_STATUS_LABELS[value],
}));

const PRIORITY_OPTIONS = (Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((value) => ({
  value,
  label: TASK_PRIORITY_LABELS[value],
}));

export function TaskBulkModals({ state, onClose, onSuccess }: TaskBulkModalsProps) {
  const { bulkAction, isLoading } = useTaskMutations();
  const { agents } = useAgentOptions();
  const [dueDate, setDueDate] = React.useState('');
  const [employee, setEmployee] = React.useState('');
  const [status, setStatus] = React.useState<TaskStatus>('pending');
  const [priority, setPriority] = React.useState<TaskPriority>('medium');

  if (!state) return null;

  async function handleAssign() {
    if (state?.type !== 'assign' || !employee) {
      toast.error('Select an agent');
      return;
    }
    await bulkAction({ taskIds: state.taskIds, assignedAgentName: employee });
    onSuccess?.();
    onClose();
  }

  async function handleStatus() {
    if (state?.type !== 'set_status') return;
    await bulkAction({ taskIds: state.taskIds, status });
    onSuccess?.();
    onClose();
  }

  async function handlePriority() {
    if (state?.type !== 'set_priority') return;
    await bulkAction({ taskIds: state.taskIds, priority });
    onSuccess?.();
    onClose();
  }

  async function handleDueDate() {
    if (state?.type !== 'change_due' || !dueDate) {
      toast.error('Select a due date');
      return;
    }
    await bulkAction({ taskIds: state.taskIds, dueDate });
    onSuccess?.();
    onClose();
  }

  if (state.type === 'assign') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign tasks ({state.taskIds.length})</DialogTitle>
          </DialogHeader>
          <FormField label="Assign to">
            <FormSearchSelect
              value={employee}
              onChange={setEmployee}
              options={agents.map((name) => ({ value: name, label: name }))}
              placeholder="Select agent…"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleAssign()}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (state.type === 'set_status') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set status ({state.taskIds.length})</DialogTitle>
          </DialogHeader>
          <FormField label="Status">
            <FormSearchSelect
              value={status}
              onChange={(v) => setStatus(v as TaskStatus)}
              options={STATUS_OPTIONS}
              searchable={false}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleStatus()}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (state.type === 'set_priority') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set priority ({state.taskIds.length})</DialogTitle>
          </DialogHeader>
          <FormField label="Priority">
            <FormSearchSelect
              value={priority}
              onChange={(v) => setPriority(v as TaskPriority)}
              options={PRIORITY_OPTIONS}
              searchable={false}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={() => void handlePriority()}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change due date ({state.taskIds.length})</DialogTitle>
        </DialogHeader>
        <FormField label="Due date">
          <input
            type="date"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={isLoading} onClick={() => void handleDueDate()}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function runTaskBulkAction(
  actionId: TaskBulkActionId,
  taskIds: string[],
  handlers: {
    openModal: (state: TaskBulkModalState) => void;
    bulkAction: (payload: Parameters<TasksApi['bulkAction']>[0]) => Promise<void>;
    exportRows: () => void;
  },
) {
  if (actionId === 'export') {
    handlers.exportRows();
    return;
  }
  if (actionId === 'mark_done') {
    void handlers.bulkAction({ taskIds, status: 'done' });
    return;
  }
  const modal = bulkActionToModal(actionId, taskIds);
  if (modal) handlers.openModal(modal);
}
