import type { OrderNavStatusCounts } from '@laam/types';

import type { NavBadges } from '@/features/navigation/api/nav-badges-api';
import { setLiveNavBadges } from '@/features/navigation/data/nav-badges-store';
import { setLiveOrderNavCounts } from '@/features/orders/data/order-status-counts-store';
import { createInFlight } from '@/lib/in-flight';

let lastStatusCountsAt = 0;
let lastNavBadgesAt = 0;

/** Min gap between identical meta fetches (focus / poll / realtime overlap). */
export const NAV_META_MIN_AGE_MS = 45_000;

export function shouldRefreshNavMeta(lastAt: number, minAgeMs = NAV_META_MIN_AGE_MS): boolean {
  if (lastAt <= 0) return true;
  return Date.now() - lastAt >= minAgeMs;
}

const fetchStatusCountsOnce = createInFlight(async (): Promise<OrderNavStatusCounts | null> => {
  try {
    const { apiRequest } = await import('@/lib/api/client');
    const { crmEndpoints } = await import('@/lib/api/endpoints');
    const counts = await apiRequest<{
      byStatus: Record<string, number>;
      followupsDue: number;
      failed: number;
    }>(`${crmEndpoints.orders}/meta/status-counts`);
    const next: OrderNavStatusCounts = {
      byStatus: counts.byStatus ?? {},
      followupsDue: counts.followupsDue ?? 0,
      failed: counts.failed ?? 0,
    };
    setLiveOrderNavCounts(next);
    lastStatusCountsAt = Date.now();
    return next;
  } catch {
    return null;
  }
});

const fetchNavBadgesOnce = createInFlight(async (): Promise<NavBadges | null> => {
  try {
    const { navBadgesApi } = await import('@/features/navigation/api/nav-badges-api');
    const badges = await navBadgesApi.getBadges();
    setLiveNavBadges(badges);
    lastNavBadgesAt = Date.now();
    return badges;
  } catch {
    return null;
  }
});

export async function refreshOrderStatusCounts(options?: {
  force?: boolean;
}): Promise<OrderNavStatusCounts | null> {
  if (!options?.force && !shouldRefreshNavMeta(lastStatusCountsAt)) {
    return null;
  }
  return fetchStatusCountsOnce();
}

export async function refreshNavBadges(options?: {
  force?: boolean;
}): Promise<NavBadges | null> {
  if (!options?.force && !shouldRefreshNavMeta(lastNavBadgesAt)) {
    return null;
  }
  return fetchNavBadgesOnce();
}

export function getLastStatusCountsAt(): number {
  return lastStatusCountsAt;
}

export function getLastNavBadgesAt(): number {
  return lastNavBadgesAt;
}
