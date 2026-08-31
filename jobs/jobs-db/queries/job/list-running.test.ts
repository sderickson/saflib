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
import { listRunningJobsJob } from "./list-running.ts";

const now = new Date("2026-08-06T12:00:00.000Z");

function jobParams(
  overrides: Partial<CreateJobParams> & Pick<CreateJobParams, "id">,
): CreateJobParams {
  return {
    status: "pending",
    operation_id: "jobsDemoStepB",
    request: { body: {} },
    user_id: "user-1",
    authority: {
      kind: "request",
      user_id: "user-1",
      request_id: "r-root",
      assertion: { payload: "p", signature: "s", key_id: "k1" },
    },
    original_request_id: "r-1",
    enqueued_by_operation_id: "startJobsDemo",
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

describe("listRunningJobsJob", () => {
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

  it("returns only running jobs", async () => {
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
    await createJob(dbKey, jobParams({ id: "job-pending", status: "pending" }));

    const { result, error } = await listRunningJobsJob(dbKey);
    expect(error).toBeUndefined();
    assert(result);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "job-running",
      operation_id: "jobsDemoStepB",
      attempt: 1,
      max_attempts: 5,
      heartbeat_at: now,
    });
  });
});
