import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  assert,
} from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { jobsDbManager } from "../../instances.ts";
import { JobNotCancellableError, JobNotFoundError } from "../../errors.ts";
import type { CreateJobParams } from "./create.ts";
import { createJob } from "./create.ts";
import { cancelByIdJob } from "./cancel-by-id.ts";
import { jobQueries } from "./index.ts";

const now = new Date("2026-08-06T12:00:00.000Z");
const later = new Date("2026-08-06T12:01:00.000Z");

function jobParams(
  overrides: Partial<CreateJobParams> & Pick<CreateJobParams, "id">,
): CreateJobParams {
  return {
    status: "pending",
    operationId: "jobsDemoStepB",
    request: { body: {} },
    userId: "user-1",
    authority: {
      kind: "request",
      userId: "user-1",
      requestId: "r-root",
      assertion: { payload: "p", signature: "s", keyId: "k1" },
    },
    originalRequestId: "r-1",
    enqueuedByOperationId: "startJobsDemo",
    parentJobId: null,
    runAt: now,
    dedupeKey: null,
    concurrencyKey: null,
    priority: 0,
    attempt: 0,
    maxAttempts: 5,
    heartbeatAt: null,
    result: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    spawnCap: 1000,
    ...overrides,
  };
}

describe("cancelByIdJob", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = jobsDbManager.connect();
  });

  afterAll(() => {
    jobsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    jobsDbManager.clearAllTablesForTests(dbKey);
  });

  it("exports the query on jobQueries", () => {
    expect(jobQueries.cancelByIdJob).toBe(cancelByIdJob);
  });

  it.each(["pending", "retrying"] as const)(
    "cancels a %s job with cancelled-by-admin",
    async (status) => {
      await createJob(dbKey, jobParams({ id: "job-1", status }));

      const { result, error } = await cancelByIdJob(dbKey, {
        id: "job-1",
        now: later,
      });

      expect(error).toBeUndefined();
      assert(result);
      expect(result.status).toBe("cancelled");
      expect(result.result).toEqual({ terminalReason: "cancelled-by-admin" });
      expect(result.finishedAt).toEqual(later);
      expect(result.updatedAt).toEqual(later);
    },
  );

  it("returns JobNotFoundError when the id does not exist", async () => {
    const { result, error } = await cancelByIdJob(dbKey, {
      id: "missing",
      now: later,
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotFoundError);
  });

  it.each(["running", "succeeded", "dead", "cancelled"] as const)(
    "returns JobNotCancellableError when status is %s",
    async (status) => {
      await createJob(
        dbKey,
        jobParams({
          id: "job-1",
          status,
          attempt: status === "running" ? 1 : 0,
          startedAt: status === "running" ? now : null,
          finishedAt:
            status === "succeeded" ||
            status === "dead" ||
            status === "cancelled"
              ? now
              : null,
          result:
            status === "cancelled"
              ? { terminalReason: "cancelled-by-admin" }
              : status === "dead"
                ? { terminalReason: "exhausted" }
                : null,
        }),
      );

      const { result, error } = await cancelByIdJob(dbKey, {
        id: "job-1",
        now: later,
      });

      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(JobNotCancellableError);
    },
  );
});
