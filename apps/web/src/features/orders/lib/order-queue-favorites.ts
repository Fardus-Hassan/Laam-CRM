const STORAGE_KEY = 'laam-order-queue-favorites';

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
