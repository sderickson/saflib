/**
 * Fixed-window counters, in memory. Each product color is one process, so a
 * shared store is unnecessary; a restart resetting the windows is fine.
 */
export interface FixedWindowLimiter {
  /** Count one hit for `key`; `false` when the key is over its limit. */
  hit(key: string): boolean;
  /** `true` when `key` is already at its limit in the current window (does not count a hit). */
  blocked(key: string): boolean;
  /** Seconds until `key`'s window resets. */
  retryAfterSeconds(key: string): number;
}

export function createFixedWindowLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): FixedWindowLimiter {
  const { limit, windowMs } = options;
  const now = options.now ?? Date.now;
  const windows = new Map<string, { start: number; count: number }>();
  let lastSweep = now();

  function sweep(t: number) {
    if (t - lastSweep < windowMs) return;
    lastSweep = t;
    for (const [key, w] of windows) {
      if (t - w.start >= windowMs) windows.delete(key);
    }
  }

  return {
    hit(key) {
      const t = now();
      sweep(t);
      let w = windows.get(key);
      if (!w || t - w.start >= windowMs) {
        w = { start: t, count: 0 };
        windows.set(key, w);
      }
      w.count += 1;
      return w.count <= limit;
    },
    blocked(key) {
      const w = windows.get(key);
      return !!w && now() - w.start < windowMs && w.count >= limit;
    },
    retryAfterSeconds(key) {
      const w = windows.get(key);
      if (!w) return 0;
      return Math.max(0, Math.ceil((w.start + windowMs - now()) / 1000));
    },
  };
}
