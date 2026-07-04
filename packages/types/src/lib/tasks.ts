import { z } from 'zod';

export const taskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'done',
  'cancelled',
]);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const taskTypeSchema = z.enum([
  'call_customer',
  'confirm_order',
  'courier_followup',
  'payment_followup',
  'lead_followup',
  'delivery_issue',
  'general',
]);

export type TaskType = z.infer<typeof taskTypeSchema>;

export const taskRelatedTypeSchema = z.enum([
  'order',
  'lead',
  'customer',
  'followup',
  'none',
]);

export type TaskRelatedType = z.infer<typeof taskRelatedTypeSchema>;

export const taskListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  taskType: taskTypeSchema,
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  assignedAgentName: z.string().optional(),
  createdByName: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  relatedType: taskRelatedTypeSchema,
  relatedId: z.string().optional(),
  relatedLabel: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  tags: z.array(z.string()).default([]),
  hasNotes: z.boolean().optional(),
});

export type TaskListItem = z.infer<typeof taskListItemSchema>;

export const taskDetailSchema = taskListItemSchema.extend({
  notes: z.string().optional(),
  activities: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
        timestamp: z.string(),
        actorName: z.string().optional(),
      }),
    )
    .default([]),
});

export type TaskDetail = z.infer<typeof taskDetailSchema>;

export const taskFilterSchema = z.enum([
  'all',
  'my_tasks',
  'today',
  'overdue',
  'done',
]);

export type TaskFilter = z.infer<typeof taskFilterSchema>;

export const taskListQuerySchema = z.object({
  filter: taskFilterSchema.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  taskType: taskTypeSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
});

export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

export const taskFilterCountSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number(),
});

export type TaskFilterCount = z.infer<typeof taskFilterCountSchema>;

export const taskListSummarySchema = z.object({
  count: z.number(),
  todayCount: z.number(),
  overdueCount: z.number(),
  doneCount: z.number(),
  myTasksCount: z.number(),
});

export type TaskListSummary = z.infer<typeof taskListSummarySchema>;

export const taskListResponseSchema = z.object({
  items: z.array(taskListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: taskListSummarySchema,
  filters: z.array(taskFilterCountSchema),
});

export type TaskListResponse = z.infer<typeof taskListResponseSchema>;

export const createTaskPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  taskType: taskTypeSchema.default('general'),
  priority: taskPrioritySchema.default('medium'),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  assignedAgentName: z.string().optional(),
  relatedType: taskRelatedTypeSchema.default('none'),
  relatedId: z.string().optional(),
  relatedLabel: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateTaskPayload = z.infer<typeof createTaskPayloadSchema>;

export const updateTaskPayloadSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  taskType: taskTypeSchema.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  assignedAgentName: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type UpdateTaskPayload = z.infer<typeof updateTaskPayloadSchema>;
