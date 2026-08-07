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
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { mockEnqueueJob, mockJobs } from "../mock-jobs.ts";
import { getSafReporters } from "@saflib/node";
import type { LeveledLogMethod } from "winston";
import type { CronEnqueuer } from "./types.ts";

// --- Test Setup ---

let dbKey: DbKey;
let warnSpy: MockInstance<LeveledLogMethod>;
let errorSpy: MockInstance<LeveledLogMethod>;
const errorReporter = vi.fn();
addErrorCollector(errorReporter);

const baseTime = new Date(2024, 5, 15, 10, 0, 0, 0);

const startWithMock = (jobs: typeof mockJobs) =>
  startJobs(jobs, { dbKey, enqueueJob: mockEnqueueJob });

// --- Tests ---

describe("startJobs", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);
    dbKey = cronDb.connect();
    vi.clearAllMocks();
    vi.mocked(mockEnqueueJob).mockResolvedValue({ deduped: false });
    const reporters = getSafReporters();
    warnSpy = vi.spyOn(reporters.log, "warn");
    errorSpy = vi.spyOn(reporters.log, "error");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should create default disabled setting if job doesn't exist in DB", async () => {
    await startWithMock({ "new-job": mockJobs["new-job"] });
    const setting = await throwError(jobSettingsDb.getByName(dbKey, "new-job"));
    expect(setting).toBeDefined();
    expect(setting.enabled).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Job setting for 'new-job' not found in DB. Creating default (disabled).",
      ),
    );
  });

  it("should skip scheduling if initial fetch fails unexpectedly", async () => {
    const getByNameSpy = vi.spyOn(jobSettingsDb, "getByName").mockReturnValue(
      Promise.resolve({
        error: new Error("Unexpected error...."),
      }),
    );
    await startWithMock({ "fail-job": mockJobs["fail-job"] });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Failed to retrieve initial job setting for 'fail-job'. Skipping job.",
      ),
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Scheduled job: fail-job"),
    );
    getByNameSpy.mockRestore();
  });

  it("should enqueue enabled job on schedule tick with cron authority params", async () => {
    await startWithMock({
      "every-second-job": mockJobs["every-second-job"],
    });
    await jobSettingsDb.setEnabled(
      dbKey,
      "every-second-job",
      true,
      "admin-enabler",
    );

    expect(mockEnqueueJob).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockEnqueueJob).toHaveBeenCalledTimes(1);
    expect(mockEnqueueJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: "every-second-job",
        enabledBy: "admin-enabler",
        operationId: "everySecondOp",
        dedupeKey: "cron:every-second-job",
        requestId: expect.any(String),
      }),
    );
    const setting = await throwError(
      jobSettingsDb.getByName(dbKey, "every-second-job"),
    );
    expect(setting.lastRunStatus).toBe("success");
    expect(setting.lastRunAt).toEqual(new Date(baseTime.getTime() + 1000));
  });

  it("should not enqueue disabled job on schedule tick", async () => {
    await jobSettingsDb.setEnabled(dbKey, "disabled-job", false);
    await startWithMock({ "disabled-job": mockJobs["disabled-job"] });
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockEnqueueJob).not.toHaveBeenCalled();
    const setting = await throwError(
      jobSettingsDb.getByName(dbKey, "disabled-job"),
    );
    expect(setting.enabled).toBe(false);
    expect(setting.lastRunStatus).toBeNull();
  });

  it("should skip and warn when enabled but enabled_by is null", async () => {
    await startWithMock({
      "every-second-job": mockJobs["every-second-job"],
    });
    // Enable without recording authority (pre-migration / incomplete row)
    await jobSettingsDb.setEnabled(dbKey, "every-second-job", true);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockEnqueueJob).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "enabled but enabled_by is null; skipping tick until an admin re-enables",
      ),
    );
    const setting = await throwError(
      jobSettingsDb.getByName(dbKey, "every-second-job"),
    );
    expect(setting.lastRunStatus).toBeNull();
  });

  it("should pass custom dedupeKey, request, and priority from JobConfig", async () => {
    await startWithMock({
      "custom-dedupe-job": mockJobs["custom-dedupe-job"],
    });
    await jobSettingsDb.setEnabled(
      dbKey,
      "custom-dedupe-job",
      true,
      "admin-enabler",
    );

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockEnqueueJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: "custom-dedupe-job",
        operationId: "customDedupeOp",
        dedupeKey: "custom:dedupe",
        request: { body: { foo: 1 } },
        priority: 5,
      }),
    );
  });

  it("should update status to fail if enqueue throws", async () => {
    const enqueueError = new Error("Enqueue failed");
    vi.mocked(mockEnqueueJob).mockRejectedValueOnce(enqueueError);
    await startWithMock({
      "every-second-job": mockJobs["every-second-job"],
    });
    await jobSettingsDb.setEnabled(
      dbKey,
      "every-second-job",
      true,
      "admin-enabler",
    );

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockEnqueueJob).toHaveBeenCalledTimes(1);
    const setting = await throwError(
      jobSettingsDb.getByName(dbKey, "every-second-job"),
    );
    expect(setting.lastRunStatus).toBe("fail");
    expect(setting.lastRunAt).toEqual(new Date(baseTime.getTime() + 1000));
    expect(errorReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        error: enqueueError,
      }),
    );
  });

  it("should log critical error if final status update fails", async () => {
    const enqueueError = new Error("Enqueue failed");
    vi.mocked(mockEnqueueJob).mockRejectedValueOnce(enqueueError);
    const dbError = new Error("DB Write Failed");

    const originalSetStatus = jobSettingsDb.setLastRunStatus;
    const setStatusSpy = vi
      .spyOn(jobSettingsDb, "setLastRunStatus")
      .mockImplementation(async (dbKeyArg, name, status) => {
        if (status === "fail") {
          throw dbError;
        }
        return originalSetStatus(dbKeyArg, name, status);
      });

    await startWithMock({
      "every-second-job": mockJobs["every-second-job"],
    });
    await jobSettingsDb.setEnabled(
      dbKey,
      "every-second-job",
      true,
      "admin-enabler",
    );

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockEnqueueJob).toHaveBeenCalledTimes(1);
    expect(errorReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: expect.stringContaining(
            "CRITICAL: Failed to set final job status to 'fail' for every-second-job. DB Error: DB Write Failed",
          ),
        }),
      }),
    );

    setStatusSpy.mockRestore();
  });

  it("uses injected enqueueJob (required)", async () => {
    const customEnqueue: CronEnqueuer = vi.fn().mockResolvedValue({});
    await startJobs(
      { "every-second-job": mockJobs["every-second-job"] },
      { dbKey, enqueueJob: customEnqueue },
    );
    await jobSettingsDb.setEnabled(
      dbKey,
      "every-second-job",
      true,
      "admin-enabler",
    );
    await vi.advanceTimersByTimeAsync(1000);
    expect(customEnqueue).toHaveBeenCalledTimes(1);
    expect(mockEnqueueJob).not.toHaveBeenCalled();
  });
});
