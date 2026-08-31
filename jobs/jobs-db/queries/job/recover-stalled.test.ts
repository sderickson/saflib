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
import { recoverStalledJob } from "./recover-stalled.ts";

const now = new Date("2026-08-06T12:00:00.000Z");
const staleHeartbeat = new Date("2026-08-06T11:50:00.000Z");

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

describe("recoverStalledJob", () => {
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

  it("returns an empty array when no ids are provided", async () => {
    const { result, error } = await recoverStalledJob(dbKey, { ids: [], now });
    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual([]);
  });

  it("returns an empty array when ids are not running", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-pending",
        status: "pending",
      }),
    );

    const { result, error } = await recoverStalledJob(dbKey, {
      ids: ["job-pending"],
      now,
    });
    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual([]);
  });

  it("moves stalled running jobs with attempts remaining to retrying", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-stale",
        status: "running",
        attempt: 2,
        max_attempts: 5,
        started_at: staleHeartbeat,
        heartbeat_at: staleHeartbeat,
      }),
    );

    const { result } = await recoverStalledJob(dbKey, {
      ids: ["job-stale"],
      now,
    });
    assert(result);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("job-stale");
    expect(result[0]!.status).toBe("retrying");
    expect(result[0]!.attempt).toBe(2);
    expect(result[0]!.run_at).toEqual(now);
    expect(result[0]!.finished_at).toBeNull();
    expect(result[0]!.updated_at).toEqual(now);
  });

  it("moves stalled running jobs with no attempts remaining to dead/exhausted", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-exhausted",
        status: "running",
        attempt: 5,
        max_attempts: 5,
        started_at: staleHeartbeat,
        heartbeat_at: staleHeartbeat,
        original_request_id: "r-2",
      }),
    );

    const { result } = await recoverStalledJob(dbKey, {
      ids: ["job-exhausted"],
      now,
    });
    assert(result);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("job-exhausted");
    expect(result[0]!.status).toBe("dead");
    expect(result[0]!.result).toEqual({ terminal_reason: "exhausted" });
    expect(result[0]!.finished_at).toEqual(now);
  });

  it("recovers both outcomes in one pass and ignores non-matching ids", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-retry",
        status: "running",
        attempt: 1,
        max_attempts: 3,
        started_at: staleHeartbeat,
        heartbeat_at: staleHeartbeat,
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-dead",
        status: "running",
        attempt: 3,
        max_attempts: 3,
        started_at: staleHeartbeat,
        heartbeat_at: staleHeartbeat,
        original_request_id: "r-2",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-pending",
        status: "pending",
        attempt: 0,
        original_request_id: "r-4",
      }),
    );

    const { result } = await recoverStalledJob(dbKey, {
      ids: ["job-retry", "job-dead", "job-pending"],
      now,
    });
    assert(result);
    expect(result).toHaveLength(2);
    const byId = Object.fromEntries(result.map((j) => [j.id, j]));
    expect(byId["job-retry"]!.status).toBe("retrying");
    expect(byId["job-dead"]!.status).toBe("dead");

    const { result: again } = await recoverStalledJob(dbKey, {
      ids: ["job-retry", "job-dead"],
      now,
    });
    assert(again);
    expect(again).toEqual([]);
  });
});
