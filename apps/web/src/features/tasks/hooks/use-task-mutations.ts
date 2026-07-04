'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { tasksApi } from '@/features/tasks/api/tasks-api';

export function useTaskMutations() {
  const [isLoading, setIsLoading] = React.useState(false);

  async function createTask(payload: Parameters<typeof tasksApi.createTask>[0]) {
    setIsLoading(true);
    try {
      const task = await tasksApi.createTask(payload);
      toast.success(`Task "${task.title}" created`);
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
      return await tasksApi.updateTask(id, patch);
    } finally {
      setIsLoading(false);
    }
  }

  async function bulkAction(payload: Parameters<typeof tasksApi.bulkAction>[0]) {
    setIsLoading(true);
    try {
      const result = await tasksApi.bulkAction(payload);
      toast.success(result.message ?? 'Bulk action completed');
      return result;
    } finally {
      setIsLoading(false);
    }
  }

  return { createTask, updateTask, bulkAction, isLoading };
}
