import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  addSimpleStreamTransport,
  removeAllSimpleStreamTransports,
} from "@saflib/node";
import { startJobs } from "./index.ts";
import { cronDb } from "@saflib/cron-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { throwError } from "@saflib/monorepo";
import {
  mockJobHandler,
  mockMinuteJobHandler,
  mockJobs,
} from "../mock-jobs.ts";

// --- Test Setup ---

// Keep local db instance for tests
let dbKey: DbKey;
let logSpy: ReturnType<typeof vi.fn>; // Spy for the stream transport

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
    logSpy = vi.fn();
    addSimpleStreamTransport(logSpy);
    // No DB reset needed as each test gets a fresh instance
  });

  afterEach(() => {
    vi.useRealTimers();
    removeAllSimpleStreamTransports();
    vi.clearAllMocks(); // Ensure logSpy mocks are cleared too
  });

  it("should create default disabled setting if job doesn't exist in DB", async () => {
    // Pass the local db instance to startJobs
    await startJobs(
      { "new-job": mockJobs["new-job"] },
      { serviceName: "test-service", dbKey },
    );
    const setting = await throwError(
      cronDb.jobSettings.getByName(dbKey, "new-job"),
    ); // Assert on local db
    expect(setting).toBeDefined();
    expect(setting.enabled).toBe(false);
    // Check for the warning log
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Job setting for 'new-job' not found in DB. Creating default (disabled).",
      ),
    );
  });

  it("should skip scheduling if initial fetch fails unexpectedly", async () => {
    // Spy on the local db instance
    const getByNameSpy = vi
      .spyOn(cronDb.jobSettings, "getByName")
      .mockReturnValue(
        Promise.resolve({
          error: new Error("Unexpected error...."),
        }),
      );
    // Pass the local db instance
    await startJobs(
      { "fail-job": mockJobs["fail-job"] },
      { serviceName: "test-service", dbKey },
    );

    // Check that the specific error was logged
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Failed to retrieve initial job setting for 'fail-job'. Skipping job.",
      ),
    );
    // Check that the scheduling log was NOT called
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Scheduled job: fail-job"),
    );
    getByNameSpy.mockRestore();
  });

  // Pass local db instance in all calls to startJobs within this describe block
  it("should run enabled job on schedule tick", async () => {
    await startJobs(
      { "every-second-job": mockJobs["every-second-job"] },
      { serviceName: "test-service", dbKey },
    );
    // Ensure the job is enabled in the DB for this test
    await cronDb.jobSettings.setEnabled(dbKey, "every-second-job", true);

    expect(mockJobHandler).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockJobHandler).toHaveBeenCalledTimes(1);
    const setting = await throwError(
      cronDb.jobSettings.getByName(dbKey, "every-second-job"),
    );
    expect(setting.lastRunStatus).toBe("success");
    expect(setting.lastRunAt).toEqual(new Date(baseTime.getTime() + 1000));
  });

  it("should not run disabled job on schedule tick", async () => {
    await cronDb.jobSettings.setEnabled(dbKey, "disabled-job", false);
    await startJobs(
      { "disabled-job": mockJobs["disabled-job"] },
      { serviceName: "test-service", dbKey },
    );
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockJobs["disabled-job"].handler).not.toHaveBeenCalled();
    const setting = await throwError(
      cronDb.jobSettings.getByName(dbKey, "disabled-job"),
    );
    expect(setting.enabled).toBe(false);
    expect(setting.lastRunStatus).toBeNull();
  });

  it("should update status to running, then success on successful run", async () => {
    await startJobs(
      { "every-second-job": mockJobs["every-second-job"] },
      { serviceName: "test-service", dbKey },
    );
    // Ensure the job is enabled in the DB for this test
    await cronDb.jobSettings.setEnabled(dbKey, "every-second-job", true);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockJobHandler).toHaveBeenCalledTimes(1);
    const setting = await throwError(
      cronDb.jobSettings.getByName(dbKey, "every-second-job"),
    );
    expect(setting.lastRunStatus).toBe("success");
    expect(setting.lastRunAt).toEqual(new Date(baseTime.getTime() + 1000));
  });

  it("should update status to fail if handler throws", async () => {
    const handlerError = new Error("Handler failed");
    mockJobHandler.mockRejectedValueOnce(handlerError);
    await startJobs(
      { "every-second-job": mockJobs["every-second-job"] },
      { serviceName: "test-service", dbKey },
    );
    await cronDb.jobSettings.setEnabled(dbKey, "every-second-job", true);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockJobHandler).toHaveBeenCalledTimes(1);
    const setting = await throwError(
      cronDb.jobSettings.getByName(dbKey, "every-second-job"),
    );
    expect(setting.lastRunStatus).toBe("fail");
    expect(setting.lastRunAt).toEqual(new Date(baseTime.getTime() + 1000));
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Handler failed"),
    );
  });

  it("should update status to timed out if handler exceeds timeoutSeconds", async () => {
    mockMinuteJobHandler.mockImplementation(
      () =>
        new Promise((_resolve, _reject) => {
          /* never settles */
        }),
    );

    await cronDb.jobSettings.setEnabled(dbKey, "every-minute-job", true);

    await startJobs(
      { "every-minute-job": mockJobs["every-minute-job"] },
      { serviceName: "test-service", dbKey },
    );
    await vi.advanceTimersByTimeAsync(1000 * 62); // Trigger the job's onTick and timeout
    const setting = await throwError(
      cronDb.jobSettings.getByName(dbKey, "every-minute-job"),
    );
    expect(setting.lastRunStatus).toBe("timed out"); // Check the final status
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("timed out after 2 seconds"),
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

    await startJobs(
      { "timeout-default-job": jobConfig },
      { serviceName: "test-service", dbKey },
    );
    await cronDb.jobSettings.setEnabled(dbKey, "timeout-default-job", true);

    await vi.advanceTimersByTimeAsync(1000 * 70); // Trigger the job

    const setting = await throwError(
      cronDb.jobSettings.getByName(dbKey, "timeout-default-job"),
    );
    expect(setting.lastRunStatus).toBe("timed out");
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("timed out after 10 seconds"),
    );
  });

  it("should log critical error if final status update fails", async () => {
    const handlerError = new Error("Handler failed");
    mockJobHandler.mockRejectedValueOnce(handlerError);
    const dbError = new Error("DB Write Failed");

    // Store the original method before spying
    const originalSetStatus = cronDb.jobSettings.setLastRunStatus;

    const setStatusSpy = vi
      .spyOn(cronDb.jobSettings, "setLastRunStatus")
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
      { serviceName: "test-service", dbKey },
    );
    await cronDb.jobSettings.setEnabled(dbKey, "every-second-job", true);

    // Advance time and wait for potential async operations triggered by the tick
    await vi.advanceTimersByTimeAsync(1000);

    // Now the handler should have been called
    expect(mockJobHandler).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Handler failed"),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "CRITICAL: Failed to set final job status to 'fail' for every-second-job. DB Error: DB Write Failed",
      ),
    );

    // Check the DB status - should be 'running' as the 'fail' update threw
    const setting = await throwError(
      cronDb.jobSettings.getByName(dbKey, "every-second-job"),
    );
    expect(setting.lastRunStatus).toBe("running");

    setStatusSpy.mockRestore(); // Restore original method
  });
});
