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
import { cancelByOriginalRequestIdJob } from "./cancel-by-original-request-id.ts";
import { jobQueries } from "./index.ts";
import { eq } from "drizzle-orm";
import { jobTable } from "../../schemas/job.ts";

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
    originalRequestId: "r-chain",
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

describe("cancelByOriginalRequestIdJob", () => {
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
    expect(jobQueries.cancelByOriginalRequestIdJob).toBe(
      cancelByOriginalRequestIdJob,
    );
  });

  it("returns an empty array when nothing matches", async () => {
    const { result, error } = await cancelByOriginalRequestIdJob(dbKey, {
      originalRequestId: "r-missing",
      now: later,
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual([]);
  });

  it("cancels pending and retrying jobs in the chain", async () => {
    await createJob(dbKey, jobParams({ id: "job-pending", status: "pending" }));
    await createJob(
      dbKey,
      jobParams({ id: "job-retrying", status: "retrying" }),
    );
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
    await createJob(
      dbKey,
      jobParams({
        id: "job-done",
        status: "succeeded",
        finishedAt: now,
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-other-chain",
        status: "pending",
        originalRequestId: "r-other",
      }),
    );

    const { result, error } = await cancelByOriginalRequestIdJob(dbKey, {
      originalRequestId: "r-chain",
      now: later,
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result).toHaveLength(2);
    expect(new Set(result.map((j) => j.id))).toEqual(
      new Set(["job-pending", "job-retrying"]),
    );
    for (const job of result) {
      expect(job.status).toBe("cancelled");
      expect(job.result).toEqual({ terminalReason: "cancelled-by-chain" });
      expect(job.finishedAt).toEqual(later);
      expect(job.updatedAt).toEqual(later);
    }

    const db = jobsDbManager.get(dbKey)!;
    const untouched = await db
      .select()
      .from(jobTable)
      .where(eq(jobTable.originalRequestId, "r-chain"));
    const byId = Object.fromEntries(untouched.map((j) => [j.id, j]));
    expect(byId["job-running"]!.status).toBe("running");
    expect(byId["job-done"]!.status).toBe("succeeded");

    const other = await db
      .select()
      .from(jobTable)
      .where(eq(jobTable.id, "job-other-chain"));
    expect(other[0]!.status).toBe("pending");
  });
});
