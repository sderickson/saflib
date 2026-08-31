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
import { countByStatusJob } from "./count-by-status.ts";

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

describe("countByStatusJob", () => {
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

  it("returns an empty array when there are no jobs", async () => {
    const { result, error } = await countByStatusJob(dbKey);
    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual([]);
  });

  it("returns counts grouped by status", async () => {
    await createJob(dbKey, jobParams({ id: "p1", status: "pending" }));
    await createJob(
      dbKey,
      jobParams({ id: "p2", status: "pending", original_request_id: "r-2" }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "r1",
        status: "running",
        attempt: 1,
        started_at: now,
        heartbeat_at: now,
        original_request_id: "r-3",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "d1",
        status: "dead",
        finished_at: now,
        result: { terminal_reason: "exhausted" },
        original_request_id: "r-4",
      }),
    );

    const { result } = await countByStatusJob(dbKey);
    assert(result);

    const byStatus = Object.fromEntries(
      result.map((row) => [row.status, row.count]),
    );
    expect(byStatus).toEqual({
      pending: 2,
      running: 1,
      dead: 1,
    });
    expect(byStatus.retrying).toBeUndefined();
  });
});
