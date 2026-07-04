import type {
  CreateTaskPayload,
  TaskDetail,
  TaskFilterCount,
  TaskListItem,
  TaskListQuery,
  TaskListResponse,
  TaskPriority,
  TaskStatus,
  TaskType,
  UpdateTaskPayload,
} from '@laam/types';

import { CUSTOMER_AGENTS } from '@/features/customers/data/mock-customers';
import { TASK_FILTERS } from '@/features/tasks/config/task-filters';

/** Reference "today" for mock filtering. */
export const MOCK_TASK_TODAY = '2026-07-02';

/** Simulated current user for "My tasks" filter. */
export const MOCK_CURRENT_AGENT = 'Sakib Ahmed';

const CUSTOMER_NAMES = [
  'Fatema Akter',
  'Karim Hassan',
  'Nusrat Jahan',
  'Kabir Hossain',
  'Rokeya Begum',
  'Anika Rahman',
  'Tanvir Hossain',
  'Lamia Akter',
  'Rubaiya Sultana',
  'Farhana Begum',
];

const TASK_TITLES: Record<TaskType, string[]> = {
  call_customer: [
    'Call about modhu gift box inquiry',
    'Callback for Ajwa khejur pricing',
    'WhatsApp follow-up on Ramadan order',
  ],
  confirm_order: [
    'Confirm pending modhu order',
    'Verify address before dispatch',
    'Confirm COD amount with buyer',
  ],
  courier_followup: [
    'Check Pathao delivery status',
    'Follow up failed delivery attempt',
    'Request re-delivery for returned parcel',
  ],
  payment_followup: [
    'Chase partial payment on order',
    'Confirm bKash payment received',
    'Follow up on advance payment',
  ],
  lead_followup: [
    'Convert lead to confirmed order',
    'Send product list to Facebook inquiry',
    'Follow up on abandoned cart lead',
  ],
  delivery_issue: [
    'Resolve wrong product delivered',
    'Handle damaged honey jar complaint',
    'Coordinate replacement for missing item',
  ],
  general: [
    'Update customer note in CRM',
    'Prepare Ramadan combo stock check',
    'Review VIP buyer list for campaign',
  ],
};

function priorityFromIndex(index: number): TaskPriority {
  if (index % 9 === 0) return 'urgent';
  if (index % 4 === 0) return 'high';
  if (index % 3 === 0) return 'low';
  return 'medium';
}

function statusFromIndex(index: number): TaskStatus {
  if (index % 7 === 0) return 'done';
  if (index % 5 === 0) return 'in_progress';
  if (index % 11 === 0) return 'cancelled';
  return 'pending';
}

function dueDate(index: number): { dueDate?: string; dueTime?: string } {
  if (index % 6 === 0) return {};
  if (index % 3 === 0) return { dueDate: MOCK_TASK_TODAY, dueTime: '18:00' };
  if (index % 4 === 0) return { dueDate: '2026-06-28', dueTime: '14:00' }; // overdue
  const day = 3 + (index % 10);
  return { dueDate: `2026-07-${String(day).padStart(2, '0')}`, dueTime: '11:00' };
}

function relatedForType(
  taskType: TaskType,
  index: number,
): Pick<TaskListItem, 'relatedType' | 'relatedId' | 'relatedLabel'> {
  if (taskType === 'confirm_order' || taskType === 'courier_followup' || taskType === 'payment_followup' || taskType === 'delivery_issue') {
    const orderNum = `ORD-${12000 + index}`;
    return { relatedType: 'order', relatedId: orderNum, relatedLabel: orderNum };
  }
  if (taskType === 'lead_followup') {
    const leadNum = `LD-${800 + index}`;
    return { relatedType: 'lead', relatedId: leadNum, relatedLabel: leadNum };
  }
  if (taskType === 'call_customer') {
    return {
      relatedType: 'customer',
      relatedId: `cust-${index}`,
      relatedLabel: CUSTOMER_NAMES[index % CUSTOMER_NAMES.length],
    };
  }
  if (index % 8 === 0) {
    return {
      relatedType: 'followup',
      relatedId: `followup-1-${index}`,
      relatedLabel: CUSTOMER_NAMES[index % CUSTOMER_NAMES.length],
    };
  }
  return { relatedType: 'none' };
}

function buildTask(index: number, taskType?: TaskType): TaskDetail {
  const type =
    taskType ??
    (Object.keys(TASK_TITLES) as TaskType[])[index % Object.keys(TASK_TITLES).length];
  const titles = TASK_TITLES[type];
  const title = titles[index % titles.length];
  const status = statusFromIndex(index);
  const priority = priorityFromIndex(index);
  const due = dueDate(index);
  const createdDay = 20 - (index % 12);
  const createdAt = `2026-06-${String(createdDay).padStart(2, '0')}T09:${String(index % 60).padStart(2, '0')}:00.000Z`;
  const assignedAgent = CUSTOMER_AGENTS[index % CUSTOMER_AGENTS.length];
  const customerName = CUSTOMER_NAMES[index % CUSTOMER_NAMES.length];
  const phone = `01${String(710000000 + index).slice(0, 9)}`;
  const related = relatedForType(type, index);

  const base: TaskListItem = {
    id: `task-${index}`,
    title,
    description: index % 3 === 0 ? 'Buyer prefers evening call after 6pm.' : undefined,
    taskType: type,
    status,
    priority,
    ...due,
    assignedAgentName: assignedAgent,
    createdByName: CUSTOMER_AGENTS[(index + 1) % CUSTOMER_AGENTS.length],
    createdAt,
    completedAt: status === 'done' ? `2026-07-01T16:00:00.000Z` : undefined,
    ...related,
    customerName: type !== 'general' ? customerName : undefined,
    customerPhone: type !== 'general' ? phone : undefined,
    tags: index % 4 === 0 ? ['VIP'] : index % 5 === 0 ? ['Ramadan'] : [],
    hasNotes: index % 5 === 0,
  };

  return {
    ...base,
    notes: base.hasNotes ? 'Customer asked for gift packaging. COD confirmed.' : undefined,
    activities: [
      {
        id: `${base.id}-a1`,
        label: 'Task created',
        timestamp: createdAt,
        actorName: base.createdByName,
      },
      ...(status === 'done'
        ? [
            {
              id: `${base.id}-a2`,
              label: 'Marked done',
              timestamp: base.completedAt!,
              actorName: assignedAgent,
            },
          ]
        : []),
    ],
  };
}

export const MOCK_TASKS: TaskDetail[] = Array.from({ length: 28 }, (_, i) =>
  buildTask(i + 1),
);

export function getMockTaskById(id: string): TaskDetail | undefined {
  return MOCK_TASKS.find((t) => t.id === id);
}

export function getTodayTaskCount(): number {
  return MOCK_TASKS.filter(
    (t) => t.dueDate === MOCK_TASK_TODAY && t.status !== 'done' && t.status !== 'cancelled',
  ).length;
}

export function createMockTask(payload: CreateTaskPayload): TaskDetail {
  const nextIndex = MOCK_TASKS.length + 1;
  const createdAt = new Date().toISOString();
  const task: TaskDetail = {
    id: `task-${nextIndex}`,
    title: payload.title,
    description: payload.description,
    taskType: payload.taskType,
    status: 'pending',
    priority: payload.priority,
    dueDate: payload.dueDate,
    dueTime: payload.dueTime,
    assignedAgentName: payload.assignedAgentName ?? MOCK_CURRENT_AGENT,
    createdByName: MOCK_CURRENT_AGENT,
    createdAt,
    relatedType: payload.relatedType,
    relatedId: payload.relatedId,
    relatedLabel: payload.relatedLabel,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    tags: payload.tags ?? [],
    hasNotes: Boolean(payload.notes?.trim()),
    notes: payload.notes,
    activities: [
      {
        id: `task-${nextIndex}-a1`,
        label: 'Task created',
        timestamp: createdAt,
        actorName: MOCK_CURRENT_AGENT,
      },
    ],
  };
  MOCK_TASKS.unshift(task);
  return task;
}

export function updateMockTask(id: string, patch: UpdateTaskPayload): TaskDetail | undefined {
  const index = MOCK_TASKS.findIndex((t) => t.id === id);
  if (index === -1) return undefined;
  const current = MOCK_TASKS[index];
  const status = patch.status ?? current.status;
  const updated: TaskDetail = {
    ...current,
    ...patch,
    hasNotes: patch.notes !== undefined ? Boolean(patch.notes.trim()) : current.hasNotes,
    tags: patch.tags ?? current.tags,
    completedAt:
      status === 'done' && current.status !== 'done'
        ? new Date().toISOString()
        : status !== 'done'
          ? undefined
          : current.completedAt,
  };
  MOCK_TASKS[index] = updated;
  return updated;
}

export function bulkUpdateMockTasks(payload: {
  taskIds: string[];
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedAgentName?: string;
  dueDate?: string;
}): { successCount: number; failedCount: number } {
  let successCount = 0;
  let failedCount = 0;
  for (const id of payload.taskIds) {
    const patch: UpdateTaskPayload = {};
    if (payload.status) patch.status = payload.status;
    if (payload.priority) patch.priority = payload.priority;
    if (payload.assignedAgentName) patch.assignedAgentName = payload.assignedAgentName;
    if (payload.dueDate) patch.dueDate = payload.dueDate;
    const result = updateMockTask(id, patch);
    if (result) successCount++;
    else failedCount++;
  }
  return { successCount, failedCount };
}

function isToday(item: TaskListItem): boolean {
  return item.dueDate === MOCK_TASK_TODAY && item.status !== 'done' && item.status !== 'cancelled';
}

function isOverdue(item: TaskListItem): boolean {
  if (!item.dueDate || item.status === 'done' || item.status === 'cancelled') return false;
  return item.dueDate < MOCK_TASK_TODAY;
}

function isMyTask(item: TaskListItem): boolean {
  return item.assignedAgentName === MOCK_CURRENT_AGENT;
}

function computeFilters(all: TaskListItem[]): TaskFilterCount[] {
  return TASK_FILTERS.map((f) => {
    let count = all.length;
    if (f.id === 'my_tasks') count = all.filter(isMyTask).length;
    if (f.id === 'today') count = all.filter(isToday).length;
    if (f.id === 'overdue') count = all.filter(isOverdue).length;
    if (f.id === 'done') count = all.filter((t) => t.status === 'done').length;
    return { id: f.id, label: f.label, count };
  });
}

export function filterMockTasks(query: TaskListQuery): TaskListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';

  const allMatching = MOCK_TASKS.filter((item) => {
    if (query.status && item.status !== query.status) return false;
    if (query.priority && item.priority !== query.priority) return false;
    if (query.taskType && item.taskType !== query.taskType) return false;

    if (query.filter === 'my_tasks' && !isMyTask(item)) return false;
    if (query.filter === 'today' && !isToday(item)) return false;
    if (query.filter === 'overdue' && !isOverdue(item)) return false;
    if (query.filter === 'done' && item.status !== 'done') return false;

    if (!search) return true;
    return (
      item.title.toLowerCase().includes(search) ||
      (item.description?.toLowerCase().includes(search) ?? false) ||
      (item.customerName?.toLowerCase().includes(search) ?? false) ||
      (item.customerPhone?.includes(search) ?? false) ||
      (item.relatedLabel?.toLowerCase().includes(search) ?? false) ||
      (item.assignedAgentName?.toLowerCase().includes(search) ?? false)
    );
  });

  const listItems = allMatching.map(({ activities: _a, notes: _n, ...li }) => li);
  const total = listItems.length;
  const start = (query.page - 1) * query.pageSize;
  const pageItems = listItems.slice(start, start + query.pageSize);

  return {
    items: pageItems,
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: {
      count: total,
      todayCount: listItems.filter(isToday).length,
      overdueCount: listItems.filter(isOverdue).length,
      doneCount: listItems.filter((t) => t.status === 'done').length,
      myTasksCount: listItems.filter(isMyTask).length,
    },
    filters: computeFilters(
      MOCK_TASKS.map(({ activities: _a, notes: _n, ...li }) => li),
    ),
  };
}
