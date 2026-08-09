import type { NavBadges } from '@/features/navigation/api/nav-badges-api';

export const NAV_BADGES_CHANGED = 'laam:nav-badges-changed';

let liveBadges: Partial<NavBadges> = {};

export function setLiveNavBadges(next: Partial<NavBadges>) {
  liveBadges = { ...liveBadges, ...next };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NAV_BADGES_CHANGED));
  }
}

export function getLiveNavBadges(): Partial<NavBadges> {
  return liveBadges;
}
