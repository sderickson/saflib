import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { JobSettingNotFoundError } from "../../errors.ts";
import { throwError } from "@saflib/monorepo";
import { jobSettings, cronDb } from "@saflib/cron-db";

describe("getByName", () => {
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

  it("should return the full job setting for an existing job", async () => {
    const jobName = "test-job-get-by-name";
    const createdJob = await jobSettings.setEnabled(dbKey, jobName, true); // Use setEnabledByName to create the job

    const retrievedJob = await throwError(
      jobSettings.getByName(dbKey, jobName),
    );
    expect(retrievedJob).toEqual(createdJob);
    expect(retrievedJob.jobName).toBe(jobName);
    expect(retrievedJob.enabled).toBe(true);
  });

  it("should throw JobSettingNotFoundError for a non-existent job", async () => {
    const jobName = "non-existent-job";
    const { error } = await jobSettings.getByName(dbKey, jobName);
    expect(error).toBeInstanceOf(JobSettingNotFoundError);
  });
});
