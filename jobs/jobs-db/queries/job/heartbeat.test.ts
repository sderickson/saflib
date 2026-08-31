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
import { JobNotFoundError, JobNotRunningError } from "../../errors.ts";
import type { CreateJobParams } from "./create.ts";
import { createJob } from "./create.ts";
import { heartbeatJob } from "./heartbeat.ts";

const now = new Date("2026-08-06T12:00:00.000Z");
const later = new Date("2026-08-06T12:00:30.000Z");

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

describe("heartbeatJob", () => {
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

  it("refreshes heartbeat_at and updated_at for a running job", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-1",
        status: "running",
        attempt: 1,
        started_at: now,
        heartbeat_at: now,
      }),
    );

    const { result, error } = await heartbeatJob(dbKey, {
      id: "job-1",
      now: later,
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.id).toBe("job-1");
    expect(result.status).toBe("running");
    expect(result.heartbeat_at).toEqual(later);
    expect(result.updated_at).toEqual(later);
    expect(result.started_at).toEqual(now);
  });

  it("returns JobNotFoundError when the id does not exist", async () => {
    const { result, error } = await heartbeatJob(dbKey, {
      id: "missing",
      now: later,
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotFoundError);
  });

  it("returns JobNotRunningError when the job is not running", async () => {
    await createJob(dbKey, jobParams({ id: "job-1", status: "pending" }));

    const { result, error } = await heartbeatJob(dbKey, {
      id: "job-1",
      now: later,
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotRunningError);
  });
});
