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
import type { CreateJobParams } from "./create.ts";
import { createJob } from "./create.ts";
import { listRunningJobsJob } from "./list-running.ts";

const now = new Date("2026-08-06T12:00:00.000Z");

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

describe("listRunningJobsJob", () => {
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

  it("returns only running jobs", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-running",
        status: "running",
        attempt: 1,
        startedAt: now,
        heartbeatAt: now,
      }),
    );
    await createJob(dbKey, jobParams({ id: "job-pending", status: "pending" }));

    const { result, error } = await listRunningJobsJob(dbKey);
    expect(error).toBeUndefined();
    assert(result);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "job-running",
      operationId: "jobsDemoStepB",
      attempt: 1,
      maxAttempts: 5,
      heartbeatAt: now,
    });
  });
});
