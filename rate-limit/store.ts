/**
 * Where window counts live. Synchronous on purpose: limits are checked on
 * the request path, and both stores (memory, better-sqlite3) are synchronous.
 */
export interface RateLimitStore {
  /** Add one to `key`'s count in the window starting at `windowStart`; returns the new count. */
  increment(key: string, windowStart: number): number;
  /** `key`'s count in the window starting at `windowStart` (0 if none). */
  get(key: string, windowStart: number): number;
  /** Forget windows that started before `before`. */
  prune(before: number): void;
}

/** Counts in this process only (tests, or limits a restart may reset). */
export function createMemoryStore(): RateLimitStore {
  const counts = new Map<string, number>();
  const id = (key: string, windowStart: number) => `${windowStart}\u0000${key}`;
  return {
    increment(key, windowStart) {
      const k = id(key, windowStart);
      const n = (counts.get(k) ?? 0) + 1;
      counts.set(k, n);
      return n;
    },
    get(key, windowStart) {
      return counts.get(id(key, windowStart)) ?? 0;
    },
    prune(before) {
      for (const k of counts.keys()) {
        if (Number(k.slice(0, k.indexOf("\u0000"))) < before) counts.delete(k);
      }
    },
  };
}
