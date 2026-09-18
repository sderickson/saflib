import { describe, it, expect, vi, afterEach } from "vitest";
import { withRunLock } from "./run-lock.ts";

// Regression: a real advance call got permanently stuck (something it
// awaited never settled — no timeout, no error, just silence), which held
// this lock forever and rejected every future advance for *every* run,
// not just the stuck one, until the whole dev-site process was restarted.
// `withRunLock` must eventually recover from a holder that never calls
// its own `finally`.
describe("withRunLock: recovers from a holder that never settles", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps rejecting while the lock is fresh, then lets a new call through once it's stale", async () => {
    vi.useFakeTimers();
    const key = Symbol("key");

    // Never resolves or rejects — simulates the exact failure mode above.
    let releaseStuckCall: (() => void) | undefined;
    const stuckPromise = new Promise<void>((resolve) => {
      releaseStuckCall = resolve;
    });
    void withRunLock(key, () => stuckPromise);
    // Let the stuck call actually acquire the lock before checking it.
    await vi.advanceTimersByTimeAsync(0);

    const rejected = await withRunLock(key, async () => "should not run");
    expect(rejected).toEqual({ locked: true });

    // Just under the staleness threshold — still rejected.
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000 - 1);
    const stillRejected = await withRunLock(key, async () => "should not run");
    expect(stillRejected).toEqual({ locked: true });

    // Past it — the stale lock is force-released for a new call.
    await vi.advanceTimersByTimeAsync(2);
    const recovered = await withRunLock(key, async () => "fresh result");
    expect(recovered).toEqual({ locked: false, result: "fresh result" });

    releaseStuckCall?.();
  });

  it("a stuck call's own (eventual) finally does not release a newer holder's lock", async () => {
    vi.useFakeTimers();
    const key = Symbol("key");

    let releaseStuckCall: (() => void) | undefined;
    const stuckPromise = new Promise<void>((resolve) => {
      releaseStuckCall = resolve;
    });
    const stuckResultPromise = withRunLock(key, () => stuckPromise);
    await vi.advanceTimersByTimeAsync(0);

    // Force it stale, and start a second, legitimately new call that's
    // still in flight when the stuck one finally (belatedly) resolves.
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 1);
    let releaseNewCall: (() => void) | undefined;
    const newPromise = new Promise<void>((resolve) => {
      releaseNewCall = resolve;
    });
    const newResultPromise = withRunLock(key, () => newPromise);
    await vi.advanceTimersByTimeAsync(0);

    // The original stuck call resolves late — must not clear the new
    // call's still-active lock.
    releaseStuckCall?.();
    await stuckResultPromise;

    const rejectedWhileNewStillRuns = await withRunLock(key, async () => "should not run");
    expect(rejectedWhileNewStillRuns).toEqual({ locked: true });

    releaseNewCall?.();
    const newResult = await newResultPromise;
    expect(newResult).toEqual({ locked: false, result: undefined });
  });
});
