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
import { recordAttemptResultJob } from "./record-attempt-result.ts";

const now = new Date("2026-08-06T12:00:00.000Z");
const later = new Date("2026-08-06T12:01:00.000Z");
const backoffAt = new Date("2026-08-06T12:05:00.000Z");

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

async function seedRunning(dbKey: DbKey, id = "job-1") {
  await createJob(
    dbKey,
    jobParams({
      id,
      status: "running",
      attempt: 1,
      started_at: now,
      heartbeat_at: now,
    }),
  );
}

describe("recordAttemptResultJob", () => {
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

  it("records succeeded: status, result, finished_at", async () => {
    await seedRunning(dbKey);

    const { result, error } = await recordAttemptResultJob(dbKey, {
      id: "job-1",
      now: later,
      outcome: "succeeded",
      result: { status_code: 200 },
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.status).toBe("succeeded");
    expect(result.result).toEqual({ status_code: 200 });
    expect(result.finished_at).toEqual(later);
    expect(result.updated_at).toEqual(later);
  });

  it("schedules retry: retrying, run_at backoff, result recorded", async () => {
    await seedRunning(dbKey);

    const { result, error } = await recordAttemptResultJob(dbKey, {
      id: "job-1",
      now: later,
      outcome: "retry",
      run_at: backoffAt,
      result: { status_code: 503, error_body: '{"error":"unavailable"}' },
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.status).toBe("retrying");
    expect(result.run_at).toEqual(backoffAt);
    expect(result.result).toEqual({
      status_code: 503,
      error_body: '{"error":"unavailable"}',
    });
    expect(result.finished_at).toBeNull();
    expect(result.updated_at).toEqual(later);
  });

  it.each([
    "exhausted",
    "permanent-status",
    "rejected-by-endpoint",
    "auth-unresolvable",
  ] as const)("records dead with terminal_reason %s", async (terminal_reason) => {
    await seedRunning(dbKey);

    const { result, error } = await recordAttemptResultJob(dbKey, {
      id: "job-1",
      now: later,
      outcome: "dead",
      result: {
        status_code: 422,
        error_body: "capped-by-caller",
        terminal_reason,
      },
    });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.status).toBe("dead");
    expect(result.result).toEqual({
      status_code: 422,
      error_body: "capped-by-caller",
      terminal_reason,
    });
    expect(result.finished_at).toEqual(later);
  });

  it("returns JobNotFoundError when the id does not exist", async () => {
    const { result, error } = await recordAttemptResultJob(dbKey, {
      id: "missing",
      now: later,
      outcome: "succeeded",
      result: { status_code: 200 },
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotFoundError);
  });

  it("returns JobNotRunningError when the job is not running", async () => {
    await createJob(dbKey, jobParams({ id: "job-1", status: "pending" }));

    const { result, error } = await recordAttemptResultJob(dbKey, {
      id: "job-1",
      now: later,
      outcome: "dead",
      result: { status_code: 500, terminal_reason: "exhausted" },
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotRunningError);
  });
});
