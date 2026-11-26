import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { cronDb, setEnabled, setLastRunStatus } from "@saflib/cron-db";
import { createCronHealthCheck } from "./health-check.ts";
import { cronDigestTile } from "./digest-tile.ts";

describe("createCronHealthCheck", () => {
  let dbKey: DbKey;
  beforeEach(() => {
    dbKey = cronDb.connect();
  });

  const run = () => createCronHealthCheck({ getDbKey: () => dbKey }).run();

  it("is ok when no enabled job's last run failed", async () => {
    await setEnabled(dbKey, "nightly", true, "admin");
    await setLastRunStatus(dbKey, "nightly", "success");
    await setEnabled(dbKey, "disabled-broken", false);
    await setLastRunStatus(dbKey, "disabled-broken", "fail");
    const outcome = await run();
    expect(outcome.status).toBe("ok");
    expect(outcome.observed).toEqual({ enabled: 1, failing: 0 });
  });

  it("warns and names enabled jobs whose last run failed or timed out", async () => {
    await setEnabled(dbKey, "a", true, "admin");
    await setLastRunStatus(dbKey, "a", "fail");
    await setEnabled(dbKey, "b", true, "admin");
    await setLastRunStatus(dbKey, "b", "timed out");
    const outcome = await run();
    expect(outcome.status).toBe("warn");
    expect(outcome.summary).toMatch(/a, b|b, a/);
  });
});

describe("cronDigestTile", () => {
  let dbKey: DbKey;
  beforeEach(() => {
    dbKey = cronDb.connect();
  });

  const jobs = {
    hourly: { schedule: "0 * * * *", enqueue: { operationId: "x" } },
    nightly: { schedule: "0 3 * * *", enqueue: { operationId: "y" } },
    off: { schedule: "0 * * * *", enqueue: { operationId: "z" } },
  } as unknown as Parameters<typeof cronDigestTile>[0]["jobs"];
  const tile = (now?: Date) =>
    cronDigestTile({ getDbKey: () => dbKey, jobs, now: now ? () => now : undefined }).tiles({ since: new Date(0) });

  it("is ok when enabled jobs ran on time, noting disabled ones", async () => {
    await setEnabled(dbKey, "hourly", true, "admin");
    await setLastRunStatus(dbKey, "hourly", "success");
    await setEnabled(dbKey, "nightly", true, "admin");
    await setEnabled(dbKey, "off", false);
    expect(await tile()).toMatchObject({ value: "2 on schedule", detail: "1 disabled", tone: "ok" });
  });

  it("needs action for failed and late jobs", async () => {
    // A fixed clock, so the nightly job's slot doesn't fall inside the
    // two hours depending on when the test runs.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    await setEnabled(dbKey, "hourly", true, "admin");
    await setLastRunStatus(dbKey, "hourly", "success");
    await setEnabled(dbKey, "nightly", true, "admin");
    await setLastRunStatus(dbKey, "nightly", "fail");
    const twoHoursLater = new Date(Date.now() + 2 * 3600_000);
    expect(await tile(twoHoursLater)).toMatchObject({ value: "1 failed · 1 late", tone: "bad" });
    vi.useRealTimers();
  });
});
