import { AsyncLocalStorage } from "node:async_hooks";

export const RUN_LOCK_MESSAGE =
  "Another workflow run is already advancing. Only one run may advance at a time — wait for it to finish (or stop it), then retry.";

/**
 * How long a lock may be held before it's treated as stale and forcibly
 * released. `finally` below only runs once `fn()`'s promise actually
 * settles — if something it awaits (an agent subprocess, a DB call) never
 * resolves or rejects at all (not merely slow), the lock would otherwise
 * stay held *forever*, silently rejecting every future advance — for
 * every run, not just the stuck one — until the whole process is
 * restarted. Comfortably above any real advance: the longest legitimate
 * agent turns observed in practice run a few minutes.
 */
const LOCK_MAX_HOLD_MS = 15 * 60 * 1000;

/**
 * Which lock keys are currently held, and when each was acquired. Keyed by
 * `dbKey` (the caller's own `@saflib/new-workflows-db` connection) rather
 * than an unconditional single global — in production there's exactly one
 * `dbKey` per running dev-site process anyway (one process, one repo), so
 * this is equivalent to a true process-wide lock there. Keying it matters
 * for *this package's own test suite*: it runs with `isolate: false`
 * (module state shared across test files, for speed — see
 * base-vitest.config.js), so an unconditional global would let one test
 * file's in-flight `advanceRun` call spuriously lock out a *different*
 * file's unrelated one if vitest happens to interleave them.
 */
const lockedKeys = new Map<unknown, { acquiredAt: number; token: number; label: string }>();
let nextToken = 0;
/** Marks "the current async call chain already holds this key's lock" — set for the duration of the locked call, visible through any depth of further `await`s. */
const holderContext = new AsyncLocalStorage<unknown>();

export type RunLockResult<T> = { locked: false; result: T } | { locked: true };

export interface ActiveLockHolder {
  /** Whatever the outermost (non-reentrant) caller identified itself as — the root run's id, for `engine.ts`'s use. */
  label: string;
  acquiredAt: number;
}

/**
 * Who (if anyone) currently holds `key`'s lock — the *root* caller's own
 * label, unaffected by however many reentrant/nested calls are happening
 * underneath it (see `withRunLock`'s reentrancy). Lets a caller answer "is
 * this specific thing actively being worked on right now" from server
 * state, not from a client's own possibly-stale/reloaded-away notion of
 * whether its request is still pending.
 */
export function getActiveLockHolder(key: unknown): ActiveLockHolder | undefined {
  const entry = lockedKeys.get(key);
  return entry ? { label: entry.label, acquiredAt: entry.acquiredAt } : undefined;
}

/**
 * Runs `fn` under a lock scoped to `key`. This system's git integration
 * (`commitIfDirty`, `revertUncommittedChanges` in `git.ts`) operates on
 * the whole repo, not just one run's own files, and isn't safe under
 * concurrent steps — two runs (or the same run advanced twice at once,
 * e.g. a double-click racing an auto-continue chain) committing at the
 * same moment is exactly what produced the "nothing to commit" and
 * `index.lock` failures this lock exists to prevent. At most one *root*
 * `advanceRun` call for a given `key` may be doing real work at any
 * moment.
 *
 * Reentrant for nested calls made from *within* an already-locked call
 * chain — a `call-workflow` step's own `advanceRun` invocation for its
 * child run isn't a second concurrent workflow, just the same one going
 * one level deeper, and must not deadlock against itself.
 *
 * Returns `{locked: true}` immediately rather than queuing behind the
 * current holder: advancing is user-initiated and interactive, so
 * silently waiting would just leave a caller hanging for however long
 * the current step (often a full agent turn) takes, with no feedback.
 */
export async function withRunLock<T>(
  key: unknown,
  label: string,
  fn: () => Promise<T>,
): Promise<RunLockResult<T>> {
  if (holderContext.getStore() === key) {
    return { locked: false, result: await fn() };
  }
  const existing = lockedKeys.get(key);
  if (existing !== undefined) {
    if (Date.now() - existing.acquiredAt < LOCK_MAX_HOLD_MS) {
      return { locked: true };
    }
    // Stale: whatever acquired this lock is never coming back to release
    // it via `finally` below. Force it clear so the system stays usable —
    // the original stuck call is abandoned in place, not cancelled; it
    // may still be occupying resources (an orphaned agent process, an
    // open DB connection), but at least it can no longer wedge every
    // other run's ability to advance.
    console.error(
      `[run-lock] forcibly releasing a lock held for over ${LOCK_MAX_HOLD_MS}ms — a previous advance call never completed`,
    );
  }
  const token = nextToken++;
  lockedKeys.set(key, { acquiredAt: Date.now(), token, label });
  try {
    return { locked: false, result: await holderContext.run(key, fn) };
  } finally {
    // Only release the slot if it's still ours — if this call was the
    // *stale* one above and got force-evicted, a newer call may already
    // hold the lock by the time this (abandoned, still-running) one
    // finally settles; clearing unconditionally would release that
    // newer, legitimate holder's lock out from under it.
    if (lockedKeys.get(key)?.token === token) {
      lockedKeys.delete(key);
    }
  }
}
