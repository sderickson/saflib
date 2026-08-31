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
import { JobNotFoundError } from "../../errors.ts";
import type { CreateJobParams } from "./create.ts";
import { createJob } from "./create.ts";
import { getByIdJob } from "./get-by-id.ts";

const now = new Date("2026-08-06T12:00:00.000Z");

function jobParams(
  overrides: Partial<CreateJobParams> & Pick<CreateJobParams, "id">,
): CreateJobParams {
  return {
    status: "pending",
    operation_id: "jobsDemoStepB",
    request: { body: { n: 1 } },
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

describe("getByIdJob", () => {
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

  it("returns the job row by id", async () => {
    await createJob(dbKey, jobParams({ id: "job-1" }));

    const { result, error } = await getByIdJob(dbKey, { id: "job-1" });

    expect(error).toBeUndefined();
    assert(result);
    expect(result.id).toBe("job-1");
    expect(result.operation_id).toBe("jobsDemoStepB");
    expect(result.request).toEqual({ body: { n: 1 } });
    expect(result.status).toBe("pending");
  });

  it("returns JobNotFoundError when the id does not exist", async () => {
    const { result, error } = await getByIdJob(dbKey, { id: "missing" });

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobNotFoundError);
  });
});
