import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { JobSettingNotFoundError } from "../../errors.ts";
import { throwError } from "@saflib/utils";
import { cronDb } from "@saflib/cron-db";

import { setEnabled } from "./set-enabled.ts";
import { getByName } from "./get-by-name.ts";
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
    const { result: createdJob } = await setEnabled(
      dbKey,
      jobName,
      true,
    ); // Use setEnabledByName to create the job

    const retrievedJob = await throwError(
      getByName(dbKey, jobName),
    );
    expect(retrievedJob).toEqual(createdJob);
    expect(retrievedJob.job_name).toBe(jobName);
    expect(retrievedJob.enabled).toBe(true);
  });

  it("should throw JobSettingNotFoundError for a non-existent job", async () => {
    const jobName = "non-existent-job";
    const { error } = await getByName(dbKey, jobName);
    expect(error).toBeInstanceOf(JobSettingNotFoundError);
  });
});
