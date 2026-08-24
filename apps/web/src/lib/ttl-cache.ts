type CacheEntry<T> = {
  data: T;
  at: number;
};

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_MAX_ENTRIES = 48;

/**
 * Small in-memory TTL cache for list/detail API responses.
 * Soft cache only — mutations should invalidate; Refresh bypasses.
 */
export function createTtlCache<T>(options?: {
  ttlMs?: number;
  maxEntries?: number;
  keyPrefix?: string;
}) {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const keyPrefix = options?.keyPrefix ?? '';
  const store = new Map<string, CacheEntry<T>>();

  function fullKey(key: string) {
    return keyPrefix ? `${keyPrefix}:${key}` : key;
  }

  function get(key: string): T | null {
    const entry = store.get(fullKey(key));
    if (!entry) return null;
    if (Date.now() - entry.at > ttlMs) {
      store.delete(fullKey(key));
      return null;
    }
    return entry.data;
  }

  function set(key: string, data: T): void {
    const k = fullKey(key);
    if (store.size >= maxEntries && !store.has(k)) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
    store.set(k, { data, at: Date.now() });
  }

  function invalidate(key?: string): void {
    if (key) {
      store.delete(fullKey(key));
      return;
    }
    store.clear();
  }

  return { get, set, invalidate, ttlMs };
}
