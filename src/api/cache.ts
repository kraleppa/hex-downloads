type Entry<T> = { value: T; expiresAt: number | null };

const memCache = new Map<string, Entry<unknown>>();
const STORAGE_PREFIX = "hex-stats:";

function readStorage<T>(key: string): Entry<T> | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as Entry<T>;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, entry: Entry<T>): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // quota exceeded — silently drop
  }
}

export function cacheGet<T>(key: string): T | null {
  const now = Date.now();
  const mem = memCache.get(key) as Entry<T> | undefined;
  if (mem && (mem.expiresAt === null || mem.expiresAt > now)) {
    return mem.value;
  }
  const stored = readStorage<T>(key);
  if (stored && (stored.expiresAt === null || stored.expiresAt > now)) {
    memCache.set(key, stored);
    return stored.value;
  }
  return null;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number | null = null): void {
  const entry: Entry<T> = {
    value,
    expiresAt: ttlMs === null ? null : Date.now() + ttlMs,
  };
  memCache.set(key, entry);
  writeStorage(key, entry);
}

export function cacheDelete(key: string): void {
  memCache.delete(key);
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // noop
  }
}
