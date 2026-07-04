export type TaskBulkActionId =
  | 'assign'
  | 'set_status'
  | 'set_priority'
  | 'change_due'
  | 'mark_done'
  | 'export';

export type TaskBulkActionDefinition = {
  id: TaskBulkActionId;
  label: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  requiresSelection?: boolean;
};

export const TASK_BULK_ACTIONS: TaskBulkActionDefinition[] = [
  { id: 'assign', label: 'Assign', requiresSelection: true, variant: 'secondary' },
  { id: 'set_status', label: 'Set status', requiresSelection: true, variant: 'outline' },
  { id: 'set_priority', label: 'Set priority', requiresSelection: true, variant: 'outline' },
  { id: 'change_due', label: 'Change due date', requiresSelection: true, variant: 'outline' },
  { id: 'mark_done', label: 'Mark done', requiresSelection: true, variant: 'outline' },
  { id: 'export', label: 'Export', requiresSelection: true, variant: 'outline' },
];
