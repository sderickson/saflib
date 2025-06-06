import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { cronDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { cronDb } from "@saflib/cron-db";

describe("setEnabledByName", () => {
  let dbKey: DbKey;
  beforeAll(() => {
    dbKey = cronDbManager.connect();
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
    const job = await cronDb.jobSettings.setEnabled(dbKey, jobName, true);
    expect(job.jobName).toBe(jobName);
    expect(job.enabled).toBe(true);
    expect(job.createdAt).toBeInstanceOf(Date);
    expect(job.updatedAt).toBeInstanceOf(Date);
  });

  it("should update an existing job setting", async () => {
    const jobName = "test-job-set-update";
    const initialJob = await cronDb.jobSettings.setEnabled(
      dbKey,
      jobName,
      true,
    );
    // Advance time by more than a second to ensure timestamp difference
    vi.advanceTimersByTime(1100);
    const updatedJob = await cronDb.jobSettings.setEnabled(
      dbKey,
      jobName,
      false,
    );
    expect(updatedJob.jobName).toBe(jobName);
    expect(updatedJob.enabled).toBe(false);
    expect(updatedJob.id).toBe(initialJob.id);
    expect(updatedJob.createdAt).toEqual(initialJob.createdAt);
    expect(updatedJob.updatedAt.getTime()).toBeGreaterThan(
      initialJob.updatedAt.getTime(),
    );
  });
});
