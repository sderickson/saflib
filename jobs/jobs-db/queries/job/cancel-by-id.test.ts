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
import { JobNotCancellableError, JobNotFoundError } from "../../errors.ts";
import type { CreateJobParams } from "./create.ts";
import { createJob } from "./create.ts";
import { cancelByIdJob } from "./cancel-by-id.ts";

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

describe("cancelByIdJob", () => {
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

  it.each(["pending", "retrying"] as const)(
    "cancels a %s job with cancelled-by-admin",
    async (status) => {
      await createJob(dbKey, jobParams({ id: "job-1", status }));

      const { result, error } = await cancelByIdJob(dbKey, {
        id: "job-1",
        now: later,
      });

      expect(error).toBeUndefined();
      assert(result);
      expect(result.status).toBe("cancelled");
      expect(result.result).toEqual({ terminal_reason: "cancelled-by-admin" });
      expect(result.finished_at).toEqual(later);
      expect(result.updated_at).toEqual(later);
    },
  );

  it("returns JobNotFoundError when the id does not exist", async () => {
    const { result, error } = await cancelByIdJob(dbKey, {
      id: "missing",
      now: later,
    });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotFoundError);
  });

  it.each(["running", "succeeded", "dead", "cancelled"] as const)(
    "returns JobNotCancellableError when status is %s",
    async (status) => {
      await createJob(
        dbKey,
        jobParams({
          id: "job-1",
          status,
          attempt: status === "running" ? 1 : 0,
          started_at: status === "running" ? now : null,
          finished_at:
            status === "succeeded" ||
            status === "dead" ||
            status === "cancelled"
              ? now
              : null,
          result:
            status === "cancelled"
              ? { terminal_reason: "cancelled-by-admin" }
              : status === "dead"
                ? { terminal_reason: "exhausted" }
                : null,
        }),
      );

      const { result, error } = await cancelByIdJob(dbKey, {
        id: "job-1",
        now: later,
      });

      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(JobNotCancellableError);
    },
  );
});
