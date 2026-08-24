'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { tasksApi } from '@/features/tasks/api/tasks-api';
import { invalidateTaskQueryCaches } from '@/features/tasks/data/task-query-cache';

export function useTaskMutations() {
  const [isLoading, setIsLoading] = React.useState(false);

  async function createTask(payload: Parameters<typeof tasksApi.createTask>[0]) {
    setIsLoading(true);
    try {
      const task = await tasksApi.createTask(payload);
      toast.success(`Task "${task.title}" created`);
      invalidateTaskQueryCaches();
      return task;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function updateTask(id: string, patch: Parameters<typeof tasksApi.updateTask>[1]) {
    setIsLoading(true);
    try {
      const task = await tasksApi.updateTask(id, patch);
      invalidateTaskQueryCaches();
      return task;
    } finally {
      setIsLoading(false);
    }
  }

  async function bulkAction(payload: Parameters<typeof tasksApi.bulkAction>[0]) {
    setIsLoading(true);
    try {
      const result = await tasksApi.bulkAction(payload);
      toast.success(result.message ?? 'Bulk action completed');
      invalidateTaskQueryCaches();
      return result;
    } finally {
      setIsLoading(false);
    }
  }

  return { createTask, updateTask, bulkAction, isLoading };
}
