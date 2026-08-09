import { getPendingReceivablesCount } from '@/features/accounting/data/mock-accounting';
import { getBlockedCount } from '@/features/security/data/mock-security';
import { getUnreadCourierCount } from '@/features/courier/data/mock-courier';
import { getOpenTicketCount } from '@/features/support/data/mock-support';
import { getTodayFollowupCount } from '@/features/followups/data/mock-followups';
import { getLowStockCount } from '@/features/inventory/data/mock-inventory';
import { getTodayTaskCount } from '@/features/tasks/data/mock-tasks';
import { getLiveNavBadges } from '@/features/navigation/data/nav-badges-store';
import { apiRequest } from '@/lib/api/client';

export type NavBadges = {
  followups: number;
  tasks: number;
  receivables: number;
  blocked: number;
  courier: number;
  support: number;
  lowStock: number;
};

export type NavBadgesApi = {
  getBadges: () => Promise<NavBadges>;
  /** Sync snapshot for nav registry (mock). HTTP mode should prefer getBadges(). */
  getBadgesSync: () => NavBadges;
};

function readBadgesSync(): NavBadges {
  const live = getLiveNavBadges();
  return {
    followups: live.followups ?? getTodayFollowupCount(),
    tasks: live.tasks ?? getTodayTaskCount(),
    receivables: live.receivables ?? getPendingReceivablesCount(),
    blocked: live.blocked ?? getBlockedCount(),
    courier: live.courier ?? getUnreadCourierCount(),
    support: live.support ?? getOpenTicketCount(),
    lowStock: live.lowStock ?? getLowStockCount(),
  };
}

export function createMockNavBadgesApi(): NavBadgesApi {
  return {
    async getBadges() {
      return readBadgesSync();
    },
    getBadgesSync: readBadgesSync,
  };
}

export function createHttpNavBadgesApi(): NavBadgesApi {
  return {
    getBadges: () => apiRequest<NavBadges>('/crm/nav/badges'),
    getBadgesSync: readBadgesSync,
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const navBadgesApi = useHttpApi ? createHttpNavBadgesApi() : createMockNavBadgesApi();

/** Single entry for nav registry — swap implementation via navBadgesApi. */
export function getNavBadgeCounts(): NavBadges {
  return navBadgesApi.getBadgesSync();
}
