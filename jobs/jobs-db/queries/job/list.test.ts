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
import { listJob } from "./list.ts";

function jobParams(
  overrides: Partial<CreateJobParams> &
    Pick<CreateJobParams, "id" | "createdAt">,
): CreateJobParams {
  const createdAt = overrides.createdAt;
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
    runAt: createdAt,
    dedupeKey: null,
    concurrencyKey: null,
    priority: 0,
    attempt: 0,
    maxAttempts: 5,
    heartbeatAt: null,
    result: null,
    updatedAt: createdAt,
    startedAt: null,
    finishedAt: null,
    spawnCap: 1000,
    ...overrides,
  };
}

describe("listJob", () => {
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

  it("returns an empty list when there are no jobs", async () => {
    const { result, error } = await listJob(dbKey);
    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual([]);
  });

  it("returns newest first", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-old",
        createdAt: new Date("2026-08-06T10:00:00.000Z"),
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-new",
        createdAt: new Date("2026-08-06T12:00:00.000Z"),
        originalRequestId: "r-2",
      }),
    );

    const { result } = await listJob(dbKey);
    assert(result);
    expect(result.map((j) => j.id)).toEqual(["job-new", "job-old"]);
  });

  it("filters by status, operationId, userId, and originalRequestId", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-match",
        createdAt: new Date("2026-08-06T12:00:00.000Z"),
        status: "dead",
        operationId: "jobsDemoStepC",
        userId: "user-2",
        originalRequestId: "r-match",
        finishedAt: new Date("2026-08-06T12:01:00.000Z"),
        result: { terminalReason: "exhausted" },
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-other",
        createdAt: new Date("2026-08-06T11:00:00.000Z"),
        status: "pending",
        operationId: "jobsDemoStepB",
        userId: "user-1",
        originalRequestId: "r-other",
      }),
    );

    const { result } = await listJob(dbKey, {
      status: "dead",
      operationId: "jobsDemoStepC",
      userId: "user-2",
      originalRequestId: "r-match",
    });

    assert(result);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("job-match");
  });

  it("filters by createdAfter and createdBefore (inclusive)", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-early",
        createdAt: new Date("2026-08-06T09:00:00.000Z"),
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-mid",
        createdAt: new Date("2026-08-06T10:00:00.000Z"),
        originalRequestId: "r-2",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-late",
        createdAt: new Date("2026-08-06T11:00:00.000Z"),
        originalRequestId: "r-3",
      }),
    );

    const { result } = await listJob(dbKey, {
      createdAfter: new Date("2026-08-06T10:00:00.000Z"),
      createdBefore: new Date("2026-08-06T10:00:00.000Z"),
    });

    assert(result);
    expect(result.map((j) => j.id)).toEqual(["job-mid"]);
  });

  it("applies limit and offset", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-a",
        createdAt: new Date("2026-08-06T12:00:00.000Z"),
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-b",
        createdAt: new Date("2026-08-06T11:00:00.000Z"),
        originalRequestId: "r-2",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-c",
        createdAt: new Date("2026-08-06T10:00:00.000Z"),
        originalRequestId: "r-3",
      }),
    );

    const page1 = await listJob(dbKey, { limit: 2, offset: 0 });
    assert(page1.result);
    expect(page1.result.map((j) => j.id)).toEqual(["job-a", "job-b"]);

    const page2 = await listJob(dbKey, { limit: 2, offset: 2 });
    assert(page2.result);
    expect(page2.result.map((j) => j.id)).toEqual(["job-c"]);
  });
});
