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
import { JobSpawnCapExceededError } from "../../errors.ts";
import type { CreateJobParams } from "./create.ts";
import { createJob } from "./create.ts";
function baseParams(
  overrides: Partial<CreateJobParams> &
    Pick<CreateJobParams, "id" | "originalRequestId">,
): CreateJobParams {
  const now = new Date("2026-08-06T12:00:00.000Z");
  return {
    status: "pending",
    operationId: "jobsDemoStepB",
    request: { body: { failuresBeforeSuccess: 0 } },
    userId: "user-1",
    authority: {
      kind: "request",
      userId: "user-1",
      requestId: "r-root",
      assertion: {
        payload: "p",
        signature: "s",
        keyId: "k1",
      },
    },
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

describe("createJob", () => {
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

  it("inserts a new job", async () => {
    const { result, error } = await createJob(
      dbKey,
      baseParams({ id: "job-1", originalRequestId: "r-1" }),
    );

    expect(error).toBeUndefined();
    assert(result);
    expect(result.deduped).toBe(false);
    expect(result.job.id).toBe("job-1");
    expect(result.job.status).toBe("pending");
    expect(result.job.operationId).toBe("jobsDemoStepB");
    expect(result.job.request).toEqual({ body: { failuresBeforeSuccess: 0 } });
    expect(result.job.originalRequestId).toBe("r-1");
  });

  it.each(["pending", "retrying"] as const)(
    "upserts on queued dedupe_key when existing status is %s",
    async (status) => {
      const first = await createJob(
        dbKey,
        baseParams({
          id: "job-1",
          originalRequestId: "r-1",
          status,
          dedupeKey: "matter:1:claim",
          request: { body: { n: 1 } },
          runAt: new Date("2026-08-06T12:00:00.000Z"),
        }),
      );
      assert(first.result);
      expect(first.result.deduped).toBe(false);

      const laterRunAt = new Date("2026-08-06T13:00:00.000Z");
      const laterUpdatedAt = new Date("2026-08-06T13:00:01.000Z");
      const second = await createJob(
        dbKey,
        baseParams({
          id: "job-2",
          originalRequestId: "r-1",
          dedupeKey: "matter:1:claim",
          request: { body: { n: 2 } },
          runAt: laterRunAt,
          updatedAt: laterUpdatedAt,
        }),
      );

      expect(second.error).toBeUndefined();
      assert(second.result);
      expect(second.result.deduped).toBe(true);
      expect(second.result.job.id).toBe("job-1");
      expect(second.result.job.status).toBe(status);
      expect(second.result.job.request).toEqual({ body: { n: 2 } });
      expect(second.result.job.runAt).toEqual(laterRunAt);
      expect(second.result.job.updatedAt).toEqual(laterUpdatedAt);
    },
  );

  it("inserts a new queued job when the only matching dedupe_key row is running", async () => {
    await createJob(
      dbKey,
      baseParams({
        id: "job-running",
        originalRequestId: "r-1",
        status: "running",
        dedupeKey: "matter:1:auto-claim",
        startedAt: new Date("2026-08-06T12:00:01.000Z"),
      }),
    );

    const { result, error } = await createJob(
      dbKey,
      baseParams({
        id: "job-follow-up",
        originalRequestId: "r-1",
        dedupeKey: "matter:1:auto-claim",
        request: { body: { drain: true } },
      }),
    );

    expect(error).toBeUndefined();
    assert(result);
    expect(result.deduped).toBe(false);
    expect(result.job.id).toBe("job-follow-up");
    expect(result.job.status).toBe("pending");
    expect(result.job.request).toEqual({ body: { drain: true } });
  });

  it.each(["succeeded", "dead", "cancelled"] as const)(
    "allows reuse of dedupe_key after prior job is %s",
    async (status) => {
      const first = await createJob(
        dbKey,
        baseParams({
          id: "job-1",
          originalRequestId: "r-1",
          dedupeKey: "matter:1:claim",
          status,
          finishedAt: new Date("2026-08-06T12:01:00.000Z"),
        }),
      );
      assert(first.result);
      expect(first.result.deduped).toBe(false);

      const second = await createJob(
        dbKey,
        baseParams({
          id: "job-2",
          originalRequestId: "r-1",
          dedupeKey: "matter:1:claim",
        }),
      );

      expect(second.error).toBeUndefined();
      assert(second.result);
      expect(second.result.deduped).toBe(false);
      expect(second.result.job.id).toBe("job-2");
    },
  );

  it("returns JobSpawnCapExceededError when spawn cap is already reached", async () => {
    const first = await createJob(
      dbKey,
      baseParams({ id: "job-1", originalRequestId: "r-1", spawnCap: 1 }),
    );
    expect(first.error).toBeUndefined();

    const { result, error } = await createJob(
      dbKey,
      baseParams({ id: "job-2", originalRequestId: "r-1", spawnCap: 1 }),
    );

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobSpawnCapExceededError);
  });

  it("counts all statuses toward the spawn cap for an originalRequestId", async () => {
    await createJob(
      dbKey,
      baseParams({
        id: "job-1",
        originalRequestId: "r-1",
        status: "succeeded",
        finishedAt: new Date("2026-08-06T12:01:00.000Z"),
        spawnCap: 1,
      }),
    );

    const { result, error } = await createJob(
      dbKey,
      baseParams({ id: "job-2", originalRequestId: "r-1", spawnCap: 1 }),
    );

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobSpawnCapExceededError);
  });

  it("does not apply spawn cap on dedupe upsert", async () => {
    await createJob(
      dbKey,
      baseParams({
        id: "job-1",
        originalRequestId: "r-1",
        dedupeKey: "k",
        spawnCap: 1,
      }),
    );

    const { result, error } = await createJob(
      dbKey,
      baseParams({
        id: "job-2",
        originalRequestId: "r-1",
        dedupeKey: "k",
        spawnCap: 1,
        request: { body: { refreshed: true } },
        runAt: new Date("2026-08-06T14:00:00.000Z"),
      }),
    );

    expect(error).toBeUndefined();
    assert(result);
    expect(result.deduped).toBe(true);
    expect(result.job.id).toBe("job-1");
    expect(result.job.request).toEqual({ body: { refreshed: true } });
  });

  it("inserts independently when dedupeKey is null", async () => {
    const first = await createJob(
      dbKey,
      baseParams({
        id: "job-1",
        originalRequestId: "r-1",
        dedupeKey: null,
      }),
    );
    const second = await createJob(
      dbKey,
      baseParams({
        id: "job-2",
        originalRequestId: "r-1",
        dedupeKey: null,
      }),
    );

    expect(first.error).toBeUndefined();
    expect(second.error).toBeUndefined();
    assert(first.result);
    assert(second.result);
    expect(first.result.deduped).toBe(false);
    expect(second.result.deduped).toBe(false);
    expect(second.result.job.id).toBe("job-2");
  });
});
