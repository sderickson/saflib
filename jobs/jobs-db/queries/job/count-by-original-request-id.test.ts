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
    operation_id: "jobsDemoStepB",
    request: { body: {} },
    user_id: "user-1",
    authority: {
      kind: "request",
      user_id: "user-1",
      request_id: "r-root",
      assertion: { payload: "p", signature: "s", key_id: "k1" },
    },
    original_request_id: "r-chain",
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



  it("returns 0 when no jobs share the original_request_id", async () => {
    const { result, error } = await countByOriginalRequestIdJob(dbKey, {
      original_request_id: "r-missing",
    });
    expect(error).toBeUndefined();
    expect(result).toBe(0);
  });

  it("counts all statuses for the chain", async () => {
    await createJob(dbKey, jobParams({ id: "job-1", status: "pending" }));
    await createJob(
      dbKey,
      jobParams({ id: "job-2", status: "succeeded", finished_at: now }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-other",
        status: "pending",
        original_request_id: "r-other",
      }),
    );

    const { result } = await countByOriginalRequestIdJob(dbKey, {
      original_request_id: "r-chain",
    });
    expect(result).toBe(2);
  });
});
