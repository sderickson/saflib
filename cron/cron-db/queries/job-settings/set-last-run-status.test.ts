import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { JobSettingNotFoundError } from "../../errors.ts";
import { cronDb } from "@saflib/cron-db";
import { throwError } from "@saflib/monorepo";

import { setEnabled } from "./set-enabled.ts";
import { getByName } from "./get-by-name.ts";
import { setLastRunStatus } from "./set-last-run-status.ts";
describe("setLastRunStatus", () => {
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

  const jobName = "test-job-status";

  beforeEach(async () => {
    // Ensure the job exists before each status test
    await setEnabled(dbKey, jobName, true);
    // Reset time for consistent starting point within this describe block
    const now = new Date();
    now.setMilliseconds(0);
    vi.setSystemTime(now);
  });

  it("should update status, updatedAt, and lastRunAt for 'success'", async () => {
    const initialJob = await throwError(
      getByName(dbKey, jobName),
    );
    // Advance time by more than a second
    vi.advanceTimersByTime(1100);
    const updatedJob = await throwError(
      setLastRunStatus(dbKey, jobName, "success"),
    );

    expect(updatedJob.last_run_status).toBe("success");
    expect(updatedJob.last_run_at).toBeInstanceOf(Date);
    expect(updatedJob.last_run_at?.getTime()).toBeGreaterThan(
      initialJob.updated_at.getTime(),
    );
    expect(updatedJob.updated_at.getTime()).toEqual(
      updatedJob.last_run_at?.getTime(),
    );
  });

  it("should update status, updatedAt, and lastRunAt for 'running'", async () => {
    const initialJob = await throwError(
      getByName(dbKey, jobName),
    );
    // Advance time by more than a second
    vi.advanceTimersByTime(1100);
    await setLastRunStatus(dbKey, jobName, "running");
    const finalJob = await throwError(getByName(dbKey, jobName)); // Re-fetch to confirm

    expect(finalJob.last_run_status).toBe("running");
    expect(finalJob.last_run_at).toBeInstanceOf(Date);
    // Check that last_run_at is roughly the advanced time
    expect(finalJob.last_run_at?.getTime()).toBeGreaterThanOrEqual(
      initialJob.updated_at.getTime() + 1000, // Allow for slight variations
    );
    // Check that updated_at matches last_run_at when status is 'running'
    expect(finalJob.updated_at.getTime()).toEqual(finalJob.last_run_at?.getTime());
    expect(finalJob.updated_at.getTime()).toBeGreaterThan(
      initialJob.updated_at.getTime(),
    );
  });

  it("should throw JobSettingNotFoundError if the job doesn't exist", async () => {
    const nonExistentJobName = "non-existent-status-job";
    const { error } = await setLastRunStatus(
      dbKey,
      nonExistentJobName,
      "fail",
    );
    expect(error).toBeInstanceOf(JobSettingNotFoundError);
  });
});
