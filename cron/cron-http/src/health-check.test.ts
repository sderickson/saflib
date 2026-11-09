import { beforeEach, describe, expect, it } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { cronDb, setEnabled, setLastRunStatus } from "@saflib/cron-db";
import { createCronHealthCheck } from "./health-check.ts";

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
