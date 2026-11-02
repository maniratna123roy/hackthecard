interface CacheEntry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function get<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function set<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= 500) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function clear(): void {
  store.clear();
}
