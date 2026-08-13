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
import { claimNextJob } from "./claim-next.ts";

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

describe("claimNextJob", () => {
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

  it("returns null when no eligible job exists", async () => {
    const { result, error } = await claimNextJob(dbKey, { now });
    expect(error).toBeUndefined();
    expect(result).toBeNull();
  });

  it("claims a pending job: running, startedAt, heartbeatAt, attempt++", async () => {
    await createJob(dbKey, jobParams({ id: "job-1", attempt: 0 }));

    const { result, error } = await claimNextJob(dbKey, { now });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.id).toBe("job-1");
    expect(result.status).toBe("running");
    expect(result.startedAt).toEqual(now);
    expect(result.heartbeatAt).toEqual(now);
    expect(result.attempt).toBe(1);
    expect(result.updatedAt).toEqual(now);
  });

  it("claims a retrying job", async () => {
    await createJob(
      dbKey,
      jobParams({ id: "job-1", status: "retrying", attempt: 2 }),
    );

    const { result } = await claimNextJob(dbKey, { now });

    assert(result);
    expect(result.id).toBe("job-1");
    expect(result.status).toBe("running");
    expect(result.attempt).toBe(3);
  });

  it("skips jobs with runAt in the future", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-future",
        runAt: new Date("2026-08-06T13:00:00.000Z"),
      }),
    );

    const { result } = await claimNextJob(dbKey, { now });
    expect(result).toBeNull();
  });

  it("skips non-claimable statuses", async () => {
    await createJob(
      dbKey,
      jobParams({ id: "job-running", status: "running", attempt: 1 }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-done",
        status: "succeeded",
        finishedAt: now,
        originalRequestId: "r-2",
      }),
    );

    const { result } = await claimNextJob(dbKey, { now });
    expect(result).toBeNull();
  });

  it("claims higher priority first", async () => {
    await createJob(dbKey, jobParams({ id: "job-low", priority: 1 }));
    await createJob(
      dbKey,
      jobParams({ id: "job-high", priority: 10, originalRequestId: "r-2" }),
    );

    const first = await claimNextJob(dbKey, { now });
    assert(first.result);
    expect(first.result.id).toBe("job-high");

    const second = await claimNextJob(dbKey, { now });
    assert(second.result);
    expect(second.result.id).toBe("job-low");
  });

  it("breaks ties by earlier runAt then id", async () => {
    const earlier = new Date("2026-08-06T11:00:00.000Z");
    await createJob(dbKey, jobParams({ id: "job-b", runAt: earlier, priority: 5 }));
    await createJob(
      dbKey,
      jobParams({
        id: "job-a",
        runAt: earlier,
        priority: 5,
        originalRequestId: "r-2",
      }),
    );

    const { result } = await claimNextJob(dbKey, { now });
    assert(result);
    expect(result.id).toBe("job-a");
  });

  it("excludes jobs whose concurrencyKey has a running peer", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-running",
        status: "running",
        concurrencyKey: "matter:1",
        attempt: 1,
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-blocked",
        concurrencyKey: "matter:1",
        originalRequestId: "r-2",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-other",
        concurrencyKey: "matter:2",
        originalRequestId: "r-3",
      }),
    );

    const { result } = await claimNextJob(dbKey, { now });
    assert(result);
    expect(result.id).toBe("job-other");

    const again = await claimNextJob(dbKey, { now });
    expect(again.result).toBeNull();
  });

  it("allows concurrent claims when concurrencyKey is null", async () => {
    await createJob(dbKey, jobParams({ id: "job-1", concurrencyKey: null }));
    await createJob(
      dbKey,
      jobParams({
        id: "job-2",
        concurrencyKey: null,
        originalRequestId: "r-2",
      }),
    );

    const first = await claimNextJob(dbKey, { now });
    const second = await claimNextJob(dbKey, { now });

    assert(first.result);
    assert(second.result);
    expect(new Set([first.result.id, second.result.id])).toEqual(
      new Set(["job-1", "job-2"]),
    );
  });

  it("is race-free: two claimers yield one winner for a single job", async () => {
    await createJob(dbKey, jobParams({ id: "job-1" }));

    const [a, b] = await Promise.all([
      claimNextJob(dbKey, { now }),
      claimNextJob(dbKey, { now }),
    ]);

    const claimed = [a.result, b.result].filter(Boolean);
    const empty = [a.result, b.result].filter((row) => row === null);
    expect(claimed).toHaveLength(1);
    expect(empty).toHaveLength(1);
    expect(claimed[0]!.id).toBe("job-1");
    expect(claimed[0]!.attempt).toBe(1);
  });
});
