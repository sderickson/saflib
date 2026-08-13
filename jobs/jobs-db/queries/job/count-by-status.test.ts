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
import { countByStatusJob } from "./count-by-status.ts";

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

describe("countByStatusJob", () => {
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

  it("returns an empty array when there are no jobs", async () => {
    const { result, error } = await countByStatusJob(dbKey);
    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual([]);
  });

  it("returns counts grouped by status", async () => {
    await createJob(dbKey, jobParams({ id: "p1", status: "pending" }));
    await createJob(
      dbKey,
      jobParams({ id: "p2", status: "pending", originalRequestId: "r-2" }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "r1",
        status: "running",
        attempt: 1,
        startedAt: now,
        heartbeatAt: now,
        originalRequestId: "r-3",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "d1",
        status: "dead",
        finishedAt: now,
        result: { terminalReason: "exhausted" },
        originalRequestId: "r-4",
      }),
    );

    const { result } = await countByStatusJob(dbKey);
    assert(result);

    const byStatus = Object.fromEntries(
      result.map((row) => [row.status, row.count]),
    );
    expect(byStatus).toEqual({
      pending: 2,
      running: 1,
      dead: 1,
    });
    expect(byStatus.retrying).toBeUndefined();
  });
});
