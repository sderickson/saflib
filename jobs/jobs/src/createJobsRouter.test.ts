import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import request from "supertest";
import express from "express";
import type { DbKey } from "@saflib/drizzle";
import { makeAdminHeaders } from "@saflib/express";
import { jobsDbManager } from "@saflib/jobs-db/instances";

import { createJobsRouter } from "./createJobsRouter.ts";
import { _resetJobsWakeForTests } from "./runJobs.ts";

import { cancelByOriginalRequestIdJob, createJob } from "@saflib/jobs-db";
const now = new Date("2026-08-06T12:00:00.000Z");

function jobParams(
  overrides: Partial<Parameters<typeof createJob>[1]> &
    Pick<Parameters<typeof createJob>[1], "id">,
) {
  return {
    status: "pending" as const,
    operationId: "testJobStepB",
    request: { body: {} },
    userId: "user-1",
    authority: {
      kind: "request" as const,
      userId: "user-1",
      requestId: "r-root",
      assertion: { payload: "p", signature: "s", keyId: "k1" },
    },
    originalRequestId: "r-1",
    enqueuedByOperationId: "testJobStart",
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

describe("createJobsRouter admin actions", () => {
  let app: express.Express;
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = jobsDbManager.connect();
  });

  afterAll(() => {
    jobsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    jobsDbManager.clearAllTablesForTests(dbKey);
    _resetJobsWakeForTests();
    app = express();
    app.use(createJobsRouter({ dbKey }));
  });

  it("POST /jobs/:id/retry re-queues a dead job", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-dead",
        status: "dead",
        attempt: 5,
        finishedAt: now,
        result: { terminalReason: "exhausted", statusCode: 500 },
      }),
    );

    const response = await request(app)
      .post("/jobs/job-dead/retry")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body.job).toMatchObject({
      id: "job-dead",
      status: "pending",
      attempt: 0,
    });
  });

  it("POST /jobs/:id/retry returns 409 for a pending job", async () => {
    await createJob(dbKey, jobParams({ id: "job-pending", status: "pending" }));

    const response = await request(app)
      .post("/jobs/job-pending/retry")
      .set(makeAdminHeaders());

    expect(response.status).toBe(409);
  });

  it("POST /jobs/:id/retry returns 404 when missing", async () => {
    const response = await request(app)
      .post("/jobs/missing/retry")
      .set(makeAdminHeaders());

    expect(response.status).toBe(404);
  });

  it("POST /jobs/:id/cancel cancels a pending job", async () => {
    await createJob(dbKey, jobParams({ id: "job-pending", status: "pending" }));

    const response = await request(app)
      .post("/jobs/job-pending/cancel")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body.job).toMatchObject({
      id: "job-pending",
      status: "cancelled",
      result: { terminalReason: "cancelled-by-admin" },
    });
  });

  it("POST /jobs/:id/cancel returns 409 for a running job", async () => {
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

    const response = await request(app)
      .post("/jobs/job-running/cancel")
      .set(makeAdminHeaders());

    expect(response.status).toBe(409);
  });

  it("POST /jobs/cancel-by-original-request cancels pending jobs in a chain", async () => {
    const chainId = "r-cancel-chain";
    await createJob(
      dbKey,
      jobParams({
        id: "job-cancel-chain",
        status: "pending",
        originalRequestId: chainId,
        runAt: new Date(Date.now() + 60_000),
      }),
    );

    const { result: cancelledRows } = await cancelByOriginalRequestIdJob(
      dbKey,
      { originalRequestId: chainId, now: new Date() },
    );
    expect(cancelledRows!.length).toBe(1);
    expect(cancelledRows![0]).toMatchObject({
      status: "cancelled",
      originalRequestId: chainId,
      result: { terminalReason: "cancelled-by-chain" },
    });
  });

  it("POST /jobs/:id/cancel returns 404 when missing", async () => {
    const response = await request(app)
      .post("/jobs/missing/cancel")
      .set(makeAdminHeaders());

    expect(response.status).toBe(404);
  });
});
