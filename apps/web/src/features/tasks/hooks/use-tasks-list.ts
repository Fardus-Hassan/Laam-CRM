'use client';

import * as React from 'react';
import type { TaskListQuery, TaskListResponse } from '@laam/types';

import { tasksApi } from '@/features/tasks/api/tasks-api';

export function useTasksList(query: TaskListQuery, listVersion = 0) {
  const [data, setData] = React.useState<TaskListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const queryKey = JSON.stringify(query);

  const fetchList = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tasksApi.listTasks(query);
      setData(response);
    } catch {
      setError('Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);

  React.useEffect(() => {
    void fetchList();
  }, [fetchList, listVersion]);

  return { data, isLoading, error, refresh: fetchList };
}
