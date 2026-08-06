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
import { recoverStalledJob } from "./recover-stalled.ts";
import { jobQueries } from "./index.ts";

const now = new Date("2026-08-06T12:00:00.000Z");
const cutoff = new Date("2026-08-06T11:59:00.000Z");
const staleHeartbeat = new Date("2026-08-06T11:50:00.000Z");
const freshHeartbeat = new Date("2026-08-06T11:59:30.000Z");

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

describe("recoverStalledJob", () => {
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
    expect(jobQueries.recoverStalledJob).toBe(recoverStalledJob);
  });

  it("returns an empty array when nothing is stalled", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-fresh",
        status: "running",
        attempt: 1,
        startedAt: now,
        heartbeatAt: freshHeartbeat,
      }),
    );

    const { result, error } = await recoverStalledJob(dbKey, { cutoff, now });
    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual([]);
  });

  it("moves stalled running jobs with attempts remaining to retrying", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-stale",
        status: "running",
        attempt: 2,
        maxAttempts: 5,
        startedAt: staleHeartbeat,
        heartbeatAt: staleHeartbeat,
      }),
    );

    const { result } = await recoverStalledJob(dbKey, { cutoff, now });
    assert(result);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("job-stale");
    expect(result[0]!.status).toBe("retrying");
    expect(result[0]!.attempt).toBe(2);
    expect(result[0]!.runAt).toEqual(now);
    expect(result[0]!.finishedAt).toBeNull();
    expect(result[0]!.updatedAt).toEqual(now);
  });

  it("moves stalled running jobs with no attempts remaining to dead/exhausted", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-exhausted",
        status: "running",
        attempt: 5,
        maxAttempts: 5,
        startedAt: staleHeartbeat,
        heartbeatAt: staleHeartbeat,
        originalRequestId: "r-2",
      }),
    );

    const { result } = await recoverStalledJob(dbKey, { cutoff, now });
    assert(result);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("job-exhausted");
    expect(result[0]!.status).toBe("dead");
    expect(result[0]!.result).toEqual({ terminalReason: "exhausted" });
    expect(result[0]!.finishedAt).toEqual(now);
  });

  it("recovers both outcomes in one pass and leaves non-stalled alone", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-retry",
        status: "running",
        attempt: 1,
        maxAttempts: 3,
        startedAt: staleHeartbeat,
        heartbeatAt: staleHeartbeat,
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-dead",
        status: "running",
        attempt: 3,
        maxAttempts: 3,
        startedAt: staleHeartbeat,
        heartbeatAt: staleHeartbeat,
        originalRequestId: "r-2",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-ok",
        status: "running",
        attempt: 1,
        maxAttempts: 3,
        startedAt: freshHeartbeat,
        heartbeatAt: freshHeartbeat,
        originalRequestId: "r-3",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-pending",
        status: "pending",
        attempt: 0,
        originalRequestId: "r-4",
      }),
    );

    const { result } = await recoverStalledJob(dbKey, { cutoff, now });
    assert(result);
    expect(result).toHaveLength(2);
    const byId = Object.fromEntries(result.map((j) => [j.id, j]));
    expect(byId["job-retry"]!.status).toBe("retrying");
    expect(byId["job-dead"]!.status).toBe("dead");

    const { result: again } = await recoverStalledJob(dbKey, { cutoff, now });
    assert(again);
    expect(again).toEqual([]);
  });
});
