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
    operation_id: "testJobStepB",
    request: { body: {} },
    user_id: "user-1",
    authority: {
      kind: "request" as const,
      user_id: "user-1",
      request_id: "r-root",
      assertion: { payload: "p", signature: "s", key_id: "k1" },
    },
    original_request_id: "r-1",
    enqueued_by_operation_id: "testJobStart",
    parent_job_id: null,
    run_at: now,
    dedupe_key: null,
    concurrency_key: null,
    priority: 0,
    attempt: 0,
    max_attempts: 5,
    heartbeat_at: null,
    result: null,
    created_at: now,
    updated_at: now,
    started_at: null,
    finished_at: null,
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
        finished_at: now,
        result: { terminal_reason: "exhausted", status_code: 500 },
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
      result: { terminal_reason: "cancelled-by-admin" },
    });
  });

  it("POST /jobs/:id/cancel returns 409 for a running job", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-running",
        status: "running",
        attempt: 1,
        started_at: now,
        heartbeat_at: now,
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
        original_request_id: chainId,
        run_at: new Date(Date.now() + 60_000),
      }),
    );

    const { result: cancelledRows } = await cancelByOriginalRequestIdJob(
      dbKey,
      { original_request_id: chainId, now: new Date() },
    );
    expect(cancelledRows!.length).toBe(1);
    expect(cancelledRows![0]).toMatchObject({
      status: "cancelled",
      original_request_id: chainId,
      result: { terminal_reason: "cancelled-by-chain" },
    });
  });

  it("POST /jobs/:id/cancel returns 404 when missing", async () => {
    const response = await request(app)
      .post("/jobs/missing/cancel")
      .set(makeAdminHeaders());

    expect(response.status).toBe(404);
  });
});
