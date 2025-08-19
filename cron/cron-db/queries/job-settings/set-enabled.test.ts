import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { cronDb, jobSettingsDb } from "@saflib/cron-db";
import assert from "assert";

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
    const { result: job } = await jobSettingsDb.setEnabled(dbKey, jobName, true);
    assert(job);
    expect(job.jobName).toBe(jobName);
    expect(job.enabled).toBe(true);
    expect(job.createdAt).toBeInstanceOf(Date);
    expect(job.updatedAt).toBeInstanceOf(Date);
  });

  it("should update an existing job setting", async () => {
    const jobName = "test-job-set-update";
    const { result: initialJob } = await jobSettingsDb.setEnabled(dbKey, jobName, true);
    assert(initialJob);
    // Advance time by more than a second to ensure timestamp difference
    vi.advanceTimersByTime(1100);
    const { result: updatedJob } = await jobSettingsDb.setEnabled(dbKey, jobName, false);
    assert(updatedJob);
    expect(updatedJob.jobName).toBe(jobName);
    expect(updatedJob.enabled).toBe(false);
    expect(updatedJob.id).toBe(initialJob.id);
    expect(updatedJob.createdAt).toEqual(initialJob.createdAt);
    expect(updatedJob.updatedAt.getTime()).toBeGreaterThan(
      initialJob.updatedAt.getTime(),
    );
  });
});
