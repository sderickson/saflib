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
import { claimNextJob } from "./claim-next.ts";

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

describe("claimNextJob", () => {
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

  it("returns null when no eligible job exists", async () => {
    const { result, error } = await claimNextJob(dbKey, { now });
    expect(error).toBeUndefined();
    expect(result).toBeNull();
  });

  it("claims a pending job: running, started_at, heartbeat_at, attempt++", async () => {
    await createJob(dbKey, jobParams({ id: "job-1", attempt: 0 }));

    const { result, error } = await claimNextJob(dbKey, { now });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.id).toBe("job-1");
    expect(result.status).toBe("running");
    expect(result.started_at).toEqual(now);
    expect(result.heartbeat_at).toEqual(now);
    expect(result.attempt).toBe(1);
    expect(result.updated_at).toEqual(now);
  });

  it("claims a retrying job", async () => {
    await createJob(
      dbKey,
      jobParams({ id: "job-1", status: "retrying", attempt: 2 }),
    );

    const { result } = await claimNextJob(dbKey, { now });

    assert(result);
    expect(result.id).toBe("job-1");
    expect(result.status).toBe("running");
    expect(result.attempt).toBe(3);
  });

  it("skips jobs with run_at in the future", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-future",
        run_at: new Date("2026-08-06T13:00:00.000Z"),
      }),
    );

    const { result } = await claimNextJob(dbKey, { now });
    expect(result).toBeNull();
  });

  it("skips non-claimable statuses", async () => {
    await createJob(
      dbKey,
      jobParams({ id: "job-running", status: "running", attempt: 1 }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-done",
        status: "succeeded",
        finished_at: now,
        original_request_id: "r-2",
      }),
    );

    const { result } = await claimNextJob(dbKey, { now });
    expect(result).toBeNull();
  });

  it("claims higher priority first", async () => {
    await createJob(dbKey, jobParams({ id: "job-low", priority: 1 }));
    await createJob(
      dbKey,
      jobParams({ id: "job-high", priority: 10, original_request_id: "r-2" }),
    );

    const first = await claimNextJob(dbKey, { now });
    assert(first.result);
    expect(first.result.id).toBe("job-high");

    const second = await claimNextJob(dbKey, { now });
    assert(second.result);
    expect(second.result.id).toBe("job-low");
  });

  it("breaks ties by earlier run_at then id", async () => {
    const earlier = new Date("2026-08-06T11:00:00.000Z");
    await createJob(dbKey, jobParams({ id: "job-b", run_at: earlier, priority: 5 }));
    await createJob(
      dbKey,
      jobParams({
        id: "job-a",
        run_at: earlier,
        priority: 5,
        original_request_id: "r-2",
      }),
    );

    const { result } = await claimNextJob(dbKey, { now });
    assert(result);
    expect(result.id).toBe("job-a");
  });

  it("excludes jobs whose concurrency_key has a running peer", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-running",
        status: "running",
        concurrency_key: "matter:1",
        attempt: 1,
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-blocked",
        concurrency_key: "matter:1",
        original_request_id: "r-2",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-other",
        concurrency_key: "matter:2",
        original_request_id: "r-3",
      }),
    );

    const { result } = await claimNextJob(dbKey, { now });
    assert(result);
    expect(result.id).toBe("job-other");

    const again = await claimNextJob(dbKey, { now });
    expect(again.result).toBeNull();
  });

  it("allows concurrent claims when concurrency_key is null", async () => {
    await createJob(dbKey, jobParams({ id: "job-1", concurrency_key: null }));
    await createJob(
      dbKey,
      jobParams({
        id: "job-2",
        concurrency_key: null,
        original_request_id: "r-2",
      }),
    );

    const first = await claimNextJob(dbKey, { now });
    const second = await claimNextJob(dbKey, { now });

    assert(first.result);
    assert(second.result);
    expect(new Set([first.result.id, second.result.id])).toEqual(
      new Set(["job-1", "job-2"]),
    );
  });

  it("is race-free: two claimers yield one winner for a single job", async () => {
    await createJob(dbKey, jobParams({ id: "job-1" }));

    const [a, b] = await Promise.all([
      claimNextJob(dbKey, { now }),
      claimNextJob(dbKey, { now }),
    ]);

    const claimed = [a.result, b.result].filter(Boolean);
    const empty = [a.result, b.result].filter((row) => row === null);
    expect(claimed).toHaveLength(1);
    expect(empty).toHaveLength(1);
    expect(claimed[0]!.id).toBe("job-1");
    expect(claimed[0]!.attempt).toBe(1);
  });
});
