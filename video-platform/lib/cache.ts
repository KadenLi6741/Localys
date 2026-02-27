const STORAGE_KEY = 'localys-cache';

const cache = new Map<string, { data: unknown; expiresAt: number }>();

/** Hydrate in-memory cache from sessionStorage on load */
function hydrate(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries: [string, { data: unknown; expiresAt: number }][] = JSON.parse(raw);
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt > now) {
        cache.set(key, entry);
      }
    }
  } catch {
    // Corrupted or quota exceeded -- ignore
  }
}

/** Persist the current cache to sessionStorage */
function persist(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const now = Date.now();
    const entries: [string, { data: unknown; expiresAt: number }][] = [];
    for (const [key, entry] of cache.entries()) {
      // Only persist non-expired, JSON-serializable entries
      // Skip signed URLs (large and short-lived relative to session)
      if (entry.expiresAt > now && !key.startsWith('signed-url:')) {
        entries.push([key, entry]);
      }
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded -- silently fail
  }
}

// Hydrate on module load (client-side only)
if (typeof window !== 'undefined') {
  hydrate();
}

export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  persist();
}

export function cacheInvalidate(key: string): void {
  cache.delete(key);
  persist();
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
  persist();
}
