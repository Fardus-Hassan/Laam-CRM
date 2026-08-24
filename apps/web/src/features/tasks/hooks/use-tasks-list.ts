'use client';

import type { TaskListQuery } from '@laam/types';

import { tasksApi } from '@/features/tasks/api/tasks-api';
import { taskListCache } from '@/features/tasks/data/task-query-cache';
import { useTtlList } from '@/lib/use-ttl-list';

export function useTasksList(query: TaskListQuery, listVersion = 0) {
  return useTtlList({
    query,
    version: listVersion,
    cache: taskListCache,
    fetcher: (q) => tasksApi.listTasks(q),
    errorMessage: 'Failed to load tasks.',
  });
}
