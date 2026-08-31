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
import { listJob } from "./list.ts";

function jobParams(
  overrides: Partial<CreateJobParams> &
    Pick<CreateJobParams, "id" | "created_at">,
): CreateJobParams {
  const created_at = overrides.created_at;
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
    run_at: created_at,
    dedupe_key: null,
    concurrency_key: null,
    priority: 0,
    attempt: 0,
    max_attempts: 5,
    heartbeat_at: null,
    result: null,
    updated_at: created_at,
    started_at: null,
    finished_at: null,
    spawnCap: 1000,
    ...overrides,
  };
}

describe("listJob", () => {
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

  it("returns an empty list when there are no jobs", async () => {
    const { result, error } = await listJob(dbKey);
    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual([]);
  });

  it("returns newest first", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-old",
        created_at: new Date("2026-08-06T10:00:00.000Z"),
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-new",
        created_at: new Date("2026-08-06T12:00:00.000Z"),
        original_request_id: "r-2",
      }),
    );

    const { result } = await listJob(dbKey);
    assert(result);
    expect(result.map((j) => j.id)).toEqual(["job-new", "job-old"]);
  });

  it("filters by status, operation_id, user_id, and original_request_id", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-match",
        created_at: new Date("2026-08-06T12:00:00.000Z"),
        status: "dead",
        operation_id: "jobsDemoStepC",
        user_id: "user-2",
        original_request_id: "r-match",
        finished_at: new Date("2026-08-06T12:01:00.000Z"),
        result: { terminal_reason: "exhausted" },
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-other",
        created_at: new Date("2026-08-06T11:00:00.000Z"),
        status: "pending",
        operation_id: "jobsDemoStepB",
        user_id: "user-1",
        original_request_id: "r-other",
      }),
    );

    const { result } = await listJob(dbKey, {
      status: "dead",
      operation_id: "jobsDemoStepC",
      user_id: "user-2",
      original_request_id: "r-match",
    });

    assert(result);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("job-match");
  });

  it("filters by created_after and created_before (inclusive)", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-early",
        created_at: new Date("2026-08-06T09:00:00.000Z"),
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-mid",
        created_at: new Date("2026-08-06T10:00:00.000Z"),
        original_request_id: "r-2",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-late",
        created_at: new Date("2026-08-06T11:00:00.000Z"),
        original_request_id: "r-3",
      }),
    );

    const { result } = await listJob(dbKey, {
      created_after: new Date("2026-08-06T10:00:00.000Z"),
      created_before: new Date("2026-08-06T10:00:00.000Z"),
    });

    assert(result);
    expect(result.map((j) => j.id)).toEqual(["job-mid"]);
  });

  it("applies limit and offset", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-a",
        created_at: new Date("2026-08-06T12:00:00.000Z"),
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-b",
        created_at: new Date("2026-08-06T11:00:00.000Z"),
        original_request_id: "r-2",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-c",
        created_at: new Date("2026-08-06T10:00:00.000Z"),
        original_request_id: "r-3",
      }),
    );

    const page1 = await listJob(dbKey, { limit: 2, offset: 0 });
    assert(page1.result);
    expect(page1.result.map((j) => j.id)).toEqual(["job-a", "job-b"]);

    const page2 = await listJob(dbKey, { limit: 2, offset: 2 });
    assert(page2.result);
    expect(page2.result.map((j) => j.id)).toEqual(["job-c"]);
  });
});
