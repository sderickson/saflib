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
import { heartbeatJob } from "./heartbeat.ts";
import { jobQueries } from "./index.ts";

const now = new Date("2026-08-06T12:00:00.000Z");
const later = new Date("2026-08-06T12:00:30.000Z");

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

describe("heartbeatJob", () => {
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
    expect(jobQueries.heartbeatJob).toBe(heartbeatJob);
  });

  it("refreshes heartbeatAt and updatedAt for a running job", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-1",
        status: "running",
        attempt: 1,
        startedAt: now,
        heartbeatAt: now,
      }),
    );

    const { result, error } = await heartbeatJob(dbKey, {
      id: "job-1",
      now: later,
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.id).toBe("job-1");
    expect(result.status).toBe("running");
    expect(result.heartbeatAt).toEqual(later);
    expect(result.updatedAt).toEqual(later);
    expect(result.startedAt).toEqual(now);
  });

  it("returns JobNotFoundError when the id does not exist", async () => {
    const { result, error } = await heartbeatJob(dbKey, {
      id: "missing",
      now: later,
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotFoundError);
  });

  it("returns JobNotRunningError when the job is not running", async () => {
    await createJob(dbKey, jobParams({ id: "job-1", status: "pending" }));

    const { result, error } = await heartbeatJob(dbKey, {
      id: "job-1",
      now: later,
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotRunningError);
  });
});
