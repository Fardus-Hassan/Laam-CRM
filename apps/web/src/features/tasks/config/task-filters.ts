import type { TaskFilter, TaskPriority, TaskStatus, TaskType } from '@laam/types';

export type TaskFilterDefinition = {
  id: TaskFilter;
  label: string;
};

export const TASK_FILTERS: TaskFilterDefinition[] = [
  { id: 'all', label: 'All tasks' },
  { id: 'my_tasks', label: 'My tasks' },
  { id: 'today', label: 'Due today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'done', label: 'Done' },
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  call_customer: 'Call customer',
  confirm_order: 'Confirm order',
  courier_followup: 'Courier follow-up',
  payment_followup: 'Payment follow-up',
  lead_followup: 'Lead follow-up',
  delivery_issue: 'Delivery issue',
  general: 'General',
};

export const TASK_RELATED_LABELS = {
  order: 'Order',
  lead: 'Lead',
  customer: 'Customer',
  followup: 'Follow-up',
  none: 'None',
} as const;
