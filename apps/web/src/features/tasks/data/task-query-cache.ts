import type { TaskListResponse } from '@laam/types';

import { createTtlCache } from '@/lib/ttl-cache';

export const taskListCache = createTtlCache<TaskListResponse>({
  ttlMs: 60_000,
  maxEntries: 40,
  keyPrefix: 'tasks-list',
});

export function invalidateTaskQueryCaches(): void {
  taskListCache.invalidate();
}
