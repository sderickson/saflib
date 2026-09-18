import { describe, it, expect, vi, afterEach } from "vitest";
import { withRunLock } from "./run-lock.ts";

// Regression: a real advance call got permanently stuck (something it
// awaited never settled — no timeout, no error, just silence), which held
// this lock forever and rejected every future advance for *every* run,
// not just the stuck one, until the whole dev-site process was restarted.
// `withRunLock` must eventually recover from a holder that never calls
// its own `finally`.
//
// Only `Date.now()` is stubbed here (not `vi.useFakeTimers()`) —
// `isolate: false` (see base-vitest.config.js) shares the whole worker's
// timer/microtask machinery across every test *file*, and faking global
// timers there was observed to break Node's own `AsyncLocalStorage`
// internals for other, real-timer test files running in the same worker.
describe("withRunLock: recovers from a holder that never settles", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps rejecting while the lock is fresh, then lets a new call through once it's stale", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    const key = Symbol("key");

    // Never resolves or rejects — simulates the exact failure mode above.
    let releaseStuckCall: (() => void) | undefined;
    const stuckPromise = new Promise<void>((resolve) => {
      releaseStuckCall = resolve;
    });
    void withRunLock(key, "stuck-run", () => stuckPromise);
    // Let the stuck call actually acquire the lock before checking it.
    await Promise.resolve();

    const rejected = await withRunLock(key, "other-run", async () => "should not run");
    expect(rejected).toEqual({ locked: true });

    // Just under the staleness threshold — still rejected.
    now.mockReturnValue(15 * 60 * 1000 - 1);
    const stillRejected = await withRunLock(key, "other-run", async () => "should not run");
    expect(stillRejected).toEqual({ locked: true });

    // Past it — the stale lock is force-released for a new call.
    now.mockReturnValue(15 * 60 * 1000 + 1);
    const recovered = await withRunLock(key, "other-run", async () => "fresh result");
    expect(recovered).toEqual({ locked: false, result: "fresh result" });

    releaseStuckCall?.();
  });

  it("a stuck call's own (eventual) finally does not release a newer holder's lock", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    const key = Symbol("key");

    let releaseStuckCall: (() => void) | undefined;
    const stuckPromise = new Promise<void>((resolve) => {
      releaseStuckCall = resolve;
    });
    const stuckResultPromise = withRunLock(key, "stuck-run", () => stuckPromise);
    await Promise.resolve();

    // Force it stale, and start a second, legitimately new call that's
    // still in flight when the stuck one finally (belatedly) resolves.
    now.mockReturnValue(15 * 60 * 1000 + 1);
    let releaseNewCall: (() => void) | undefined;
    const newPromise = new Promise<void>((resolve) => {
      releaseNewCall = resolve;
    });
    const newResultPromise = withRunLock(key, "new-run", () => newPromise);
    await Promise.resolve();

    // The original stuck call resolves late — must not clear the new
    // call's still-active lock.
    releaseStuckCall?.();
    await stuckResultPromise;

    const rejectedWhileNewStillRuns = await withRunLock(key, "other-run", async () => "should not run");
    expect(rejectedWhileNewStillRuns).toEqual({ locked: true });

    releaseNewCall?.();
    const newResult = await newResultPromise;
    expect(newResult).toEqual({ locked: false, result: undefined });
  });
});
