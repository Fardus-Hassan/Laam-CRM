'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { followupsApi } from '@/features/followups/api/followups-api';

export function useFollowupMutations() {
  const [isLoading, setIsLoading] = React.useState(false);

  async function updateFollowup(
    id: string,
    patch: Parameters<typeof followupsApi.updateFollowup>[1],
  ) {
    setIsLoading(true);
    try {
      return await followupsApi.updateFollowup(id, patch);
    } finally {
      setIsLoading(false);
    }
  }

  async function bulkAction(payload: Parameters<typeof followupsApi.bulkAction>[0]) {
    setIsLoading(true);
    try {
      const result = await followupsApi.bulkAction(payload);
      toast.success(result.message ?? 'Bulk action completed');
      return result;
    } finally {
      setIsLoading(false);
    }
  }

  return { updateFollowup, bulkAction, isLoading };
}
