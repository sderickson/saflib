import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { jobsDbManager } from "../../instances.ts";
import type { CreateJobParams } from "./create.ts";
import { createJob } from "./create.ts";
import { countByOriginalRequestIdJob } from "./count-by-original-request-id.ts";

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

describe("countByOriginalRequestIdJob", () => {
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



  it("returns 0 when no jobs share the originalRequestId", async () => {
    const { result, error } = await countByOriginalRequestIdJob(dbKey, {
      originalRequestId: "r-missing",
    });
    expect(error).toBeUndefined();
    expect(result).toBe(0);
  });

  it("counts all statuses for the chain", async () => {
    await createJob(dbKey, jobParams({ id: "job-1", status: "pending" }));
    await createJob(
      dbKey,
      jobParams({ id: "job-2", status: "succeeded", finishedAt: now }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-other",
        status: "pending",
        originalRequestId: "r-other",
      }),
    );

    const { result } = await countByOriginalRequestIdJob(dbKey, {
      originalRequestId: "r-chain",
    });
    expect(result).toBe(2);
  });
});
