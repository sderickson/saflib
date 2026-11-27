import { createMemoryStore, type RateLimitStore } from "./store.ts";

export interface FixedWindowLimiter {
  /** Count one hit for `key`; `false` when the key is over its limit. */
  hit(key: string): boolean;
  /** `true` when `key` is already at its limit in the current window (does not count a hit). */
  blocked(key: string): boolean;
  /** Seconds until `key`'s window resets. */
  retryAfterSeconds(key: string): number;
}

export interface FixedWindowLimiterOptions {
  limit: number;
  windowMs: number;
  /** Defaults to memory (per process). Use `createSqliteStore` to share across processes. */
  store?: RateLimitStore;
  now?: () => number;
}

/**
 * Fixed windows aligned to multiples of `windowMs` (so every process agrees
 * on where a window starts). A key can see up to 2× `limit` across a window
 * boundary, the usual fixed-window trade for one counter per key.
 */
export function createFixedWindowLimiter(options: FixedWindowLimiterOptions): FixedWindowLimiter {
  const { limit, windowMs } = options;
  const store = options.store ?? createMemoryStore();
  const now = options.now ?? Date.now;
  const windowStart = (t: number) => Math.floor(t / windowMs) * windowMs;
  let lastPrune = 0;

  return {
    hit(key) {
      const t = now();
      const start = windowStart(t);
      if (start !== lastPrune) {
        lastPrune = start;
        store.prune(start);
      }
      return store.increment(key, start) <= limit;
    },
    blocked(key) {
      return store.get(key, windowStart(now())) >= limit;
    },
    retryAfterSeconds(key) {
      const t = now();
      const start = windowStart(t);
      if (store.get(key, start) === 0) return 0;
      return Math.max(0, Math.ceil((start + windowMs - t) / 1000));
    },
  };
}
