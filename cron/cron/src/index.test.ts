import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import { addErrorCollector } from "@saflib/node";
import { startJobs } from "./index.ts";
import { cronDb, jobSettingsDb } from "@saflib/cron-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { throwError } from "@saflib/monorepo";
import { mockJobHandler, mockJobs } from "../mock-jobs.ts";
import { getSafReporters } from "@saflib/node";
import type { LeveledLogMethod } from "winston";

// --- Test Setup ---

// Keep local db instance for tests
let dbKey: DbKey;
let warnSpy: MockInstance<LeveledLogMethod>;
let errorSpy: MockInstance<LeveledLogMethod>;
const errorReporter = vi.fn();
addErrorCollector(errorReporter);

const baseTime = new Date(2024, 5, 15, 10, 0, 0, 0);

// --- Tests ---

describe("startJobs", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);
    // Create a fresh DB instance for each test
    dbKey = cronDb.connect();
    vi.clearAllMocks();
    mockJobHandler.mockResolvedValue("Success");
    const reporters = getSafReporters();
    warnSpy = vi.spyOn(reporters.log, "warn");
    errorSpy = vi.spyOn(reporters.log, "error");
    // No DB reset needed as each test gets a fresh instance
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks(); // Ensure logSpy mocks are cleared too
  });

  it("should create default disabled setting if job doesn't exist in DB", async () => {
    // Pass the local db instance to startJobs
    await startJobs({ "new-job": mockJobs["new-job"] }, { dbKey });
    const setting = await throwError(jobSettingsDb.getByName(dbKey, "new-job")); // Assert on local db
    expect(setting).toBeDefined();
    expect(setting.enabled).toBe(false);
    // Check for the warning log
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Job setting for 'new-job' not found in DB. Creating default (disabled).",
      ),
    );
  });

  it("should skip scheduling if initial fetch fails unexpectedly", async () => {
    // Spy on the local db instance
    const getByNameSpy = vi.spyOn(jobSettingsDb, "getByName").mockReturnValue(
      Promise.resolve({
        error: new Error("Unexpected error...."),
      }),
    );
    // Pass the local db instance
    await startJobs({ "fail-job": mockJobs["fail-job"] }, { dbKey });

    // Check that the specific error was logged
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Failed to retrieve initial job setting for 'fail-job'. Skipping job.",
      ),
    );
    // Check that the scheduling log was NOT called
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Scheduled job: fail-job"),
    );
    getByNameSpy.mockRestore();
  });

  // Pass local db instance in all calls to startJobs within this describe block
  it("should run enabled job on schedule tick", async () => {
    await startJobs(
      { "every-second-job": mockJobs["every-second-job"] },
      { dbKey },
    );
    // Ensure the job is enabled in the DB for this test
    await jobSettingsDb.setEnabled(dbKey, "every-second-job", true);

    expect(mockJobHandler).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockJobHandler).toHaveBeenCalledTimes(1);
    const setting = await throwError(
      jobSettingsDb.getByName(dbKey, "every-second-job"),
    );
    expect(setting.lastRunStatus).toBe("success");
    expect(setting.lastRunAt).toEqual(new Date(baseTime.getTime() + 1000));
  });

  it("should not run disabled job on schedule tick", async () => {
    await jobSettingsDb.setEnabled(dbKey, "disabled-job", false);
    await startJobs({ "disabled-job": mockJobs["disabled-job"] }, { dbKey });
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockJobs["disabled-job"].handler).not.toHaveBeenCalled();
    const setting = await throwError(
      jobSettingsDb.getByName(dbKey, "disabled-job"),
    );
    expect(setting.enabled).toBe(false);
    expect(setting.lastRunStatus).toBeNull();
  });

  it("should update status to running, then success on successful run", async () => {
    await startJobs(
      { "every-second-job": mockJobs["every-second-job"] },
      { dbKey },
    );
    // Ensure the job is enabled in the DB for this test
    await jobSettingsDb.setEnabled(dbKey, "every-second-job", true);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockJobHandler).toHaveBeenCalledTimes(1);
    const setting = await throwError(
      jobSettingsDb.getByName(dbKey, "every-second-job"),
    );
    expect(setting.lastRunStatus).toBe("success");
    expect(setting.lastRunAt).toEqual(new Date(baseTime.getTime() + 1000));
  });

  it("should update status to fail if handler throws", async () => {
    const handlerError = new Error("Handler failed");
    mockJobHandler.mockRejectedValueOnce(handlerError);
    await startJobs(
      { "every-second-job": mockJobs["every-second-job"] },
      { dbKey },
    );
    await jobSettingsDb.setEnabled(dbKey, "every-second-job", true);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockJobHandler).toHaveBeenCalledTimes(1);
    const setting = await throwError(
      jobSettingsDb.getByName(dbKey, "every-second-job"),
    );
    expect(setting.lastRunStatus).toBe("fail");
    expect(setting.lastRunAt).toEqual(new Date(baseTime.getTime() + 1000));
    expect(errorReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        error: handlerError,
      }),
    );
  });

  it("should update status to timed out if handler exceeds default timeout", async () => {
    // Get the job config and override the handler for this test
    const jobConfig = { ...mockJobs["timeout-default-job"] };
    jobConfig.handler = vi.fn(
      () =>
        new Promise((_resolve, _reject) => {
          /* never settles */
        }),
    );

    await startJobs({ "timeout-default-job": jobConfig }, { dbKey });
    await jobSettingsDb.setEnabled(dbKey, "timeout-default-job", true);

    await vi.advanceTimersByTimeAsync(1000 * 70); // Trigger the job

    const setting = await throwError(
      jobSettingsDb.getByName(dbKey, "timeout-default-job"),
    );
    expect(setting.lastRunStatus).toBe("timed out");
    expect(errorReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: expect.stringContaining("timed out after 10 seconds"),
        }),
      }),
    );
  });

  it("should log critical error if final status update fails", async () => {
    const handlerError = new Error("Handler failed");
    mockJobHandler.mockRejectedValueOnce(handlerError);
    const dbError = new Error("DB Write Failed");

    // Store the original method before spying
    const originalSetStatus = jobSettingsDb.setLastRunStatus;

    const setStatusSpy = vi
      .spyOn(jobSettingsDb, "setLastRunStatus")
      .mockImplementation(async (dbKey, name, status) => {
        if (status === "fail") {
          // Throw the specific error for the 'fail' case
          throw dbError;
        }
        // For 'running' (or any other status), call the original implementation
        // Need to bind `this` correctly if the original method relies on it,
        // but jobSettings is likely just an object holding functions here.
        return originalSetStatus(dbKey, name, status);
      });

    await startJobs(
      { "every-second-job": mockJobs["every-second-job"] },
      { dbKey },
    );
    await jobSettingsDb.setEnabled(dbKey, "every-second-job", true);

    // Advance time and wait for potential async operations triggered by the tick
    await vi.advanceTimersByTimeAsync(1000);

    // Now the handler should have been called
    expect(mockJobHandler).toHaveBeenCalledTimes(1);
    expect(errorReporter).toHaveBeenCalled();
    expect(errorReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: expect.stringContaining(
            "CRITICAL: Failed to set final job status to 'fail' for every-second-job. DB Error: DB Write Failed",
          ),
        }),
      }),
    );

    // Check the DB status - should be 'running' as the 'fail' update threw
    const setting = await throwError(
      jobSettingsDb.getByName(dbKey, "every-second-job"),
    );
    expect(setting.lastRunStatus).toBe("running");

    setStatusSpy.mockRestore(); // Restore original method
  });
});
