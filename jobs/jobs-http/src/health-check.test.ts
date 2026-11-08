import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { jobsDbManager } from "@saflib/jobs-db/instances";
import { createJob, type CreateJobParams } from "@saflib/jobs-db/queries/job/create";
import { createJobsHealthCheck } from "./health-check.ts";

function job(id: string, overrides: Partial<CreateJobParams> = {}): CreateJobParams {
  const now = new Date();
  return {
    id,
    status: "pending",
    operation_id: "op",
    request: { body: {} },
    user_id: "user-1",
    authority: {
      kind: "request",
      user_id: "user-1",
      request_id: "r-root",
      assertion: { payload: "p", signature: "s", key_id: "k1" },
    },
    original_request_id: `r-${id}`,
    enqueued_by_operation_id: "start",
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

describe("createJobsHealthCheck", () => {
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

  const run = () => createJobsHealthCheck({ getDbKey: () => dbKey }).run();

  it("is ok with no recent dead jobs, and reports queue depth", async () => {
    await createJob(dbKey, job("p1"));
    await createJob(dbKey, job("old-dead", { status: "dead", finished_at: new Date(Date.now() - 3 * 86_400_000) }));
    const outcome = await run();
    expect(outcome.status).toBe("ok");
    expect(outcome.observed).toMatchObject({ dead_last_24h: 0, pending: 1 });
  });

  it("warns when a job went dead in the last day", async () => {
    await createJob(dbKey, job("dead", { status: "dead", finished_at: new Date() }));
    const outcome = await run();
    expect(outcome.status).toBe("warn");
    expect(outcome.summary).toMatch(/1 job\(s\) went dead/);
  });
});
