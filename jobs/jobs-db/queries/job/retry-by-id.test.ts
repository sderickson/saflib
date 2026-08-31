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
import { JobNotFoundError, JobNotRetryableError } from "../../errors.ts";
import type { CreateJobParams } from "./create.ts";
import { createJob } from "./create.ts";
import { retryByIdJob } from "./retry-by-id.ts";

const now = new Date("2026-08-06T12:00:00.000Z");
const later = new Date("2026-08-06T12:01:00.000Z");

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

describe("retryByIdJob", () => {
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

  it.each(["dead", "cancelled"] as const)(
    "retries a %s job: pending, attempt 0, result cleared",
    async (status) => {
      await createJob(
        dbKey,
        jobParams({
          id: "job-1",
          status,
          attempt: 3,
          started_at: now,
          heartbeat_at: now,
          finished_at: now,
          result: {
            status_code: 500,
            terminal_reason:
              status === "dead" ? "exhausted" : "cancelled-by-admin",
          },
        }),
      );

      const { result, error } = await retryByIdJob(dbKey, {
        id: "job-1",
        now: later,
      });

      expect(error).toBeUndefined();
      assert(result);
      expect(result.status).toBe("pending");
      expect(result.attempt).toBe(0);
      expect(result.result).toBeNull();
      expect(result.finished_at).toBeNull();
      expect(result.started_at).toBeNull();
      expect(result.heartbeat_at).toBeNull();
      expect(result.run_at).toEqual(later);
      expect(result.updated_at).toEqual(later);
    },
  );

  it("returns JobNotFoundError when the id does not exist", async () => {
    const { result, error } = await retryByIdJob(dbKey, {
      id: "missing",
      now: later,
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotFoundError);
  });

  it.each(["pending", "running", "retrying", "succeeded"] as const)(
    "returns JobNotRetryableError when status is %s",
    async (status) => {
      await createJob(
        dbKey,
        jobParams({
          id: "job-1",
          status,
          attempt: status === "running" || status === "retrying" ? 1 : 0,
          started_at: status === "running" ? now : null,
          finished_at: status === "succeeded" ? now : null,
        }),
      );

      const { result, error } = await retryByIdJob(dbKey, {
        id: "job-1",
        now: later,
      });

      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(JobNotRetryableError);
    },
  );
});
