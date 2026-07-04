import type {
  CreateTaskPayload,
  TaskDetail,
  TaskListQuery,
  TaskListResponse,
  TaskPriority,
  TaskStatus,
  UpdateTaskPayload,
} from '@laam/types';

import {
  bulkUpdateMockTasks,
  createMockTask,
  filterMockTasks,
  getMockTaskById,
  updateMockTask,
} from '@/features/tasks/data/mock-tasks';

export type TasksApi = {
  listTasks: (query: TaskListQuery) => Promise<TaskListResponse>;
  getTask: (id: string) => Promise<TaskDetail | null>;
  createTask: (payload: CreateTaskPayload) => Promise<TaskDetail>;
  updateTask: (id: string, patch: UpdateTaskPayload) => Promise<TaskDetail>;
  bulkAction: (payload: {
    taskIds: string[];
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedAgentName?: string;
    dueDate?: string;
  }) => Promise<{ successCount: number; failedCount: number; message?: string }>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockTasksApi(): TasksApi {
  return {
    async listTasks(query) {
      await delay(120);
      return filterMockTasks(query);
    },
    async getTask(id) {
      await delay(80);
      return getMockTaskById(id) ?? null;
    },
    async createTask(payload) {
      await delay(120);
      return createMockTask(payload);
    },
    async updateTask(id, patch) {
      await delay(100);
      const updated = updateMockTask(id, patch);
      if (!updated) throw new Error('Task not found');
      return updated;
    },
    async bulkAction(payload) {
      await delay(150);
      const result = bulkUpdateMockTasks(payload);
      return { ...result, message: `Updated ${result.successCount} task(s)` };
    },
  };
}

export function createHttpTasksApi(): TasksApi {
  return {
    async listTasks(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (query.filter) params.set('filter', query.filter);
      if (query.status) params.set('status', query.status);
      if (query.priority) params.set('priority', query.priority);
      if (query.taskType) params.set('taskType', query.taskType);
      if (query.search) params.set('search', query.search);
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      return apiRequest<TaskListResponse>(`/crm/tasks?${params.toString()}`);
    },
    async getTask(id) {
      const { apiRequest } = await import('@/lib/api/client');
      try {
        return await apiRequest<TaskDetail>(`/crm/tasks/${id}`);
      } catch {
        return null;
      }
    },
    async createTask(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<TaskDetail>('/crm/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateTask(id, patch) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<TaskDetail>(`/crm/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
    async bulkAction(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<{ successCount: number; failedCount: number; message?: string }>(
        '/crm/tasks/bulk',
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const tasksApi = useHttpApi ? createHttpTasksApi() : createMockTasksApi();
