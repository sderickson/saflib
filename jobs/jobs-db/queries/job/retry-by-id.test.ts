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
import { JobNotFoundError, JobNotRetryableError } from "../../errors.ts";
import type { CreateJobParams } from "./create.ts";
import { createJob } from "./create.ts";
import { retryByIdJob } from "./retry-by-id.ts";

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

describe("retryByIdJob", () => {
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

  it.each(["dead", "cancelled"] as const)(
    "retries a %s job: pending, attempt 0, result cleared",
    async (status) => {
      await createJob(
        dbKey,
        jobParams({
          id: "job-1",
          status,
          attempt: 3,
          startedAt: now,
          heartbeatAt: now,
          finishedAt: now,
          result: {
            statusCode: 500,
            terminalReason:
              status === "dead" ? "exhausted" : "cancelled-by-admin",
          },
        }),
      );

      const { result, error } = await retryByIdJob(dbKey, {
        id: "job-1",
        now: later,
      });

      expect(error).toBeUndefined();
      assert(result);
      expect(result.status).toBe("pending");
      expect(result.attempt).toBe(0);
      expect(result.result).toBeNull();
      expect(result.finishedAt).toBeNull();
      expect(result.startedAt).toBeNull();
      expect(result.heartbeatAt).toBeNull();
      expect(result.runAt).toEqual(later);
      expect(result.updatedAt).toEqual(later);
    },
  );

  it("returns JobNotFoundError when the id does not exist", async () => {
    const { result, error } = await retryByIdJob(dbKey, {
      id: "missing",
      now: later,
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotFoundError);
  });

  it.each(["pending", "running", "retrying", "succeeded"] as const)(
    "returns JobNotRetryableError when status is %s",
    async (status) => {
      await createJob(
        dbKey,
        jobParams({
          id: "job-1",
          status,
          attempt: status === "running" || status === "retrying" ? 1 : 0,
          startedAt: status === "running" ? now : null,
          finishedAt: status === "succeeded" ? now : null,
        }),
      );

      const { result, error } = await retryByIdJob(dbKey, {
        id: "job-1",
        now: later,
      });

      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(JobNotRetryableError);
    },
  );
});
