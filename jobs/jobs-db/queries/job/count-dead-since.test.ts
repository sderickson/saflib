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
import { countDeadSinceJob } from "./count-dead-since.ts";

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

describe("countDeadSinceJob", () => {
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

  it("counts only jobs that went dead since the cutoff", async () => {
    const old = new Date("2026-08-01T00:00:00.000Z");
    const recent = new Date("2026-08-06T11:00:00.000Z");
    await createJob(dbKey, jobParams({ id: "d-old", status: "dead", finished_at: old, original_request_id: "r-a" }));
    await createJob(dbKey, jobParams({ id: "d-new", status: "dead", finished_at: recent, original_request_id: "r-b" }));
    await createJob(dbKey, jobParams({ id: "ok", status: "succeeded", finished_at: recent, original_request_id: "r-c" }));

    const { result, error } = await countDeadSinceJob(dbKey, new Date("2026-08-05T12:00:00.000Z"));
    expect(error).toBeUndefined();
    assert(result !== undefined);
    expect(result).toBe(1);
  });
});
