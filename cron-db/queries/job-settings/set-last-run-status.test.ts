import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import { cronDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { JobSettingNotFoundError } from "../../errors.ts";
import { cronDb } from "@saflib/cron-db";
import { throwError } from "@saflib/monorepo";

describe("setLastRunStatus", () => {
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

  const jobName = "test-job-status";

  beforeEach(async () => {
    // Ensure the job exists before each status test
    await cronDb.jobSettings.setEnabled(dbKey, jobName, true);
    // Reset time for consistent starting point within this describe block
    const now = new Date();
    now.setMilliseconds(0);
    vi.setSystemTime(now);
  });

  it("should update status and updatedAt but not lastRunAt for 'success'", async () => {
    const initialJob = await throwError(
      cronDb.jobSettings.getByName(dbKey, jobName),
    );
    // Advance time by more than a second
    vi.advanceTimersByTime(1100);
    const updatedJob = await throwError(
      cronDb.jobSettings.setLastRunStatus(dbKey, jobName, "success"),
    );

    expect(updatedJob.lastRunStatus).toBe("success");
    expect(updatedJob.lastRunAt).toBe(initialJob.lastRunAt); // Should remain null or previous value
    expect(updatedJob.updatedAt.getTime()).toBeGreaterThan(
      initialJob.updatedAt.getTime(),
    );
  });

  it("should update status, updatedAt, and lastRunAt for 'running'", async () => {
    const initialJob = await throwError(
      cronDb.jobSettings.getByName(dbKey, jobName),
    );
    // Advance time by more than a second
    vi.advanceTimersByTime(1100);
    await cronDb.jobSettings.setLastRunStatus(dbKey, jobName, "running");
    const finalJob = await throwError(
      cronDb.jobSettings.getByName(dbKey, jobName),
    ); // Re-fetch to confirm

    expect(finalJob.lastRunStatus).toBe("running");
    expect(finalJob.lastRunAt).toBeInstanceOf(Date);
    // Check that lastRunAt is roughly the advanced time
    expect(finalJob.lastRunAt?.getTime()).toBeGreaterThanOrEqual(
      initialJob.updatedAt.getTime() + 1000, // Allow for slight variations
    );
    // Check that updatedAt matches lastRunAt when status is 'running'
    expect(finalJob.updatedAt.getTime()).toEqual(finalJob.lastRunAt?.getTime());
    expect(finalJob.updatedAt.getTime()).toBeGreaterThan(
      initialJob.updatedAt.getTime(),
    );
  });

  it("should throw JobSettingNotFoundError if the job doesn't exist", async () => {
    const nonExistentJobName = "non-existent-status-job";
    const { error } = await cronDb.jobSettings.setLastRunStatus(
      dbKey,
      nonExistentJobName,
      "fail",
    );
    expect(error).toBeInstanceOf(JobSettingNotFoundError);
  });
});
