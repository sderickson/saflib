import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { cronDb } from "@saflib/cron-db";
import assert from "assert";

import { setEnabled } from "./set-enabled.ts";
describe("setEnabledByName", () => {
  let dbKey: DbKey;
  beforeAll(() => {
    dbKey = cronDb.connect();
    vi.useFakeTimers();
    const now = new Date();
    now.setMilliseconds(0);
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("should create a new job setting if it doesn't exist", async () => {
    const jobName = "test-job-set-new";
    const { result: job } = await setEnabled(
      dbKey,
      jobName,
      true,
      "admin-user-1",
    );
    assert(job);
    expect(job.jobName).toBe(jobName);
    expect(job.enabled).toBe(true);
    expect(job.enabledBy).toBe("admin-user-1");
    expect(job.createdAt).toBeInstanceOf(Date);
    expect(job.updatedAt).toBeInstanceOf(Date);
  });

  it("should update an existing job setting", async () => {
    const jobName = "test-job-set-update";
    const { result: initialJob } = await setEnabled(
      dbKey,
      jobName,
      true,
      "admin-user-1",
    );
    assert(initialJob);
    // Advance time by more than a second to ensure timestamp difference
    vi.advanceTimersByTime(1100);
    const { result: updatedJob } = await setEnabled(
      dbKey,
      jobName,
      false,
    );
    assert(updatedJob);
    expect(updatedJob.jobName).toBe(jobName);
    expect(updatedJob.enabled).toBe(false);
    expect(updatedJob.enabledBy).toBe("admin-user-1");
    expect(updatedJob.id).toBe(initialJob.id);
    expect(updatedJob.createdAt).toEqual(initialJob.createdAt);
    expect(updatedJob.updatedAt.getTime()).toBeGreaterThan(
      initialJob.updatedAt.getTime(),
    );
  });

  it("records enabledBy when enabling", async () => {
    const jobName = "test-job-enabled-by-record";
    const { result: job } = await setEnabled(
      dbKey,
      jobName,
      true,
      "enabler-id",
    );
    assert(job);
    expect(job.enabled).toBe(true);
    expect(job.enabledBy).toBe("enabler-id");
  });

  it("retains enabledBy when disabling", async () => {
    const jobName = "test-job-enabled-by-retain";
    await setEnabled(dbKey, jobName, true, "original-enabler");
    const { result: disabled } = await setEnabled(
      dbKey,
      jobName,
      false,
    );
    assert(disabled);
    expect(disabled.enabled).toBe(false);
    expect(disabled.enabledBy).toBe("original-enabler");
  });

  it("updates enabledBy when re-enabling as a different admin", async () => {
    const jobName = "test-job-enabled-by-reenable";
    await setEnabled(dbKey, jobName, true, "admin-a");
    await setEnabled(dbKey, jobName, false);
    const { result: reenabled } = await setEnabled(
      dbKey,
      jobName,
      true,
      "admin-b",
    );
    assert(reenabled);
    expect(reenabled.enabled).toBe(true);
    expect(reenabled.enabledBy).toBe("admin-b");
  });
});
