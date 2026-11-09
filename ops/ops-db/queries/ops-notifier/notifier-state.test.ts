import { describe, expect, it } from "vitest";
import { throwError } from "@saflib/utils";
import { claimNotification, getNotifierState, opsDb, releaseNotification } from "../../index.ts";

describe("notifier state", () => {
  it("rate limits, caps per day, and lets only one process claim", async () => {
    const dbKey = opsDb.connect();
    const t = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 9, h, m));
    const limits = { channel: "email", minGapMs: 15 * 60_000, dailyCap: 2 };

    const start = await throwError(getNotifierState(dbKey, "email", t(0)));
    expect(start.cursor).toEqual(t(0));
    expect((await throwError(getNotifierState(dbKey, "email", t(5)))).cursor).toEqual(t(0));

    const first = await throwError(claimNotification(dbKey, { ...limits, expectedCursor: t(0), now: t(1) }));
    expect(first).toEqual({ claimed: true, since: t(0) });
    // A second process still holding the old cursor loses.
    expect(await throwError(claimNotification(dbKey, { ...limits, expectedCursor: t(0), now: t(1) }))).toMatchObject({
      claimed: false,
      reason: "raced",
    });
    expect(await throwError(claimNotification(dbKey, { ...limits, expectedCursor: t(1), now: t(1, 10) }))).toMatchObject({
      claimed: false,
      reason: "rate_limited",
    });
    expect((await throwError(claimNotification(dbKey, { ...limits, expectedCursor: t(1), now: t(2) }))).claimed).toBe(true);
    expect(await throwError(claimNotification(dbKey, { ...limits, expectedCursor: t(2), now: t(3) }))).toMatchObject({
      claimed: false,
      reason: "daily_cap",
    });
    // Next UTC day resets the cap.
    const tomorrow = new Date(Date.UTC(2026, 10, 10, 1));
    expect((await throwError(claimNotification(dbKey, { ...limits, expectedCursor: t(2), now: tomorrow }))).claimed).toBe(true);

    await throwError(releaseNotification(dbKey, "email", t(2)));
    expect((await throwError(getNotifierState(dbKey, "email"))).cursor).toEqual(t(2));
  });
});
