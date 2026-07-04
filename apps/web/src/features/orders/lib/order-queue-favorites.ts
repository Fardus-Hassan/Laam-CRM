import type { ResolvedNavChild } from '@/features/navigation/types/universal-nav';

const STORAGE_KEY = 'laam-order-queue-favorites';

export const ORDER_QUEUE_FAVORITES_CHANGED = 'laam-order-queue-favorites-changed';

export function loadOrderQueueFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveOrderQueueFavorites(slugs: string[]): string[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ORDER_QUEUE_FAVORITES_CHANGED));
  }
  return slugs;
}

export function toggleOrderQueueFavorite(slug: string): string[] {
  const current = loadOrderQueueFavorites();
  const next = current.includes(slug)
    ? current.filter((item) => item !== slug)
    : [...current, slug];
  return saveOrderQueueFavorites(next);
}

export function isOrderQueueFavorite(slug: string): boolean {
  return loadOrderQueueFavorites().includes(slug);
}

/** Map sidebar child id → queue slug used for favorites. */
export function navChildIdToQueueSlug(childId: string): string | null {
  if (childId.startsWith('orders-status-')) {
    return childId.replace('orders-status-', '');
  }
  if (childId.startsWith('orders-')) {
    return childId.replace('orders-', '');
  }
  return null;
}

export function sortNavChildrenByFavorites(
  children: ResolvedNavChild[],
  favorites: string[],
): ResolvedNavChild[] {
  if (favorites.length === 0) return children;

  const rank = new Map(favorites.map((slug, index) => [slug, index]));

  return [...children].sort((a, b) => {
    const slugA = navChildIdToQueueSlug(a.id);
    const slugB = navChildIdToQueueSlug(b.id);
    const rankA = slugA !== null ? rank.get(slugA) : undefined;
    const rankB = slugB !== null ? rank.get(slugB) : undefined;

    if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;
    return 0;
  });
}
