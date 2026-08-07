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
import { JobNotFoundError, JobNotRunningError } from "../../errors.ts";
import type { CreateJobParams } from "./create.ts";
import { createJob } from "./create.ts";
import { recordAttemptResultJob } from "./record-attempt-result.ts";
import { jobQueries } from "./index.ts";

const now = new Date("2026-08-06T12:00:00.000Z");
const later = new Date("2026-08-06T12:01:00.000Z");
const backoffAt = new Date("2026-08-06T12:05:00.000Z");

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

async function seedRunning(dbKey: DbKey, id = "job-1") {
  await createJob(
    dbKey,
    jobParams({
      id,
      status: "running",
      attempt: 1,
      startedAt: now,
      heartbeatAt: now,
    }),
  );
}

describe("recordAttemptResultJob", () => {
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
    expect(jobQueries.recordAttemptResultJob).toBe(recordAttemptResultJob);
  });

  it("records succeeded: status, result, finishedAt", async () => {
    await seedRunning(dbKey);

    const { result, error } = await recordAttemptResultJob(dbKey, {
      id: "job-1",
      now: later,
      outcome: "succeeded",
      result: { statusCode: 200 },
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.status).toBe("succeeded");
    expect(result.result).toEqual({ statusCode: 200 });
    expect(result.finishedAt).toEqual(later);
    expect(result.updatedAt).toEqual(later);
  });

  it("schedules retry: retrying, runAt backoff, result recorded", async () => {
    await seedRunning(dbKey);

    const { result, error } = await recordAttemptResultJob(dbKey, {
      id: "job-1",
      now: later,
      outcome: "retry",
      runAt: backoffAt,
      result: { statusCode: 503, errorBody: '{"error":"unavailable"}' },
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.status).toBe("retrying");
    expect(result.runAt).toEqual(backoffAt);
    expect(result.result).toEqual({
      statusCode: 503,
      errorBody: '{"error":"unavailable"}',
    });
    expect(result.finishedAt).toBeNull();
    expect(result.updatedAt).toEqual(later);
  });

  it.each([
    "exhausted",
    "permanent-status",
    "rejected-by-endpoint",
    "auth-unresolvable",
  ] as const)("records dead with terminalReason %s", async (terminalReason) => {
    await seedRunning(dbKey);

    const { result, error } = await recordAttemptResultJob(dbKey, {
      id: "job-1",
      now: later,
      outcome: "dead",
      result: {
        statusCode: 422,
        errorBody: "capped-by-caller",
        terminalReason,
      },
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.status).toBe("dead");
    expect(result.result).toEqual({
      statusCode: 422,
      errorBody: "capped-by-caller",
      terminalReason,
    });
    expect(result.finishedAt).toEqual(later);
  });

  it("returns JobNotFoundError when the id does not exist", async () => {
    const { result, error } = await recordAttemptResultJob(dbKey, {
      id: "missing",
      now: later,
      outcome: "succeeded",
      result: { statusCode: 200 },
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotFoundError);
  });

  it("returns JobNotRunningError when the job is not running", async () => {
    await createJob(dbKey, jobParams({ id: "job-1", status: "pending" }));

    const { result, error } = await recordAttemptResultJob(dbKey, {
      id: "job-1",
      now: later,
      outcome: "dead",
      result: { statusCode: 500, terminalReason: "exhausted" },
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotRunningError);
  });
});
