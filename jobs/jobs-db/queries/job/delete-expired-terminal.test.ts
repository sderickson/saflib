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
import { deleteExpiredTerminalJob } from "./delete-expired-terminal.ts";
import { getByIdJob } from "./get-by-id.ts";

import { JobNotFoundError } from "../../errors.ts";

const now = new Date("2026-08-06T12:00:00.000Z");
const cutoff = new Date("2026-08-01T00:00:00.000Z");
const expiredFinished = new Date("2026-07-01T00:00:00.000Z");
const recentFinished = new Date("2026-08-05T00:00:00.000Z");

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

describe("deleteExpiredTerminalJob", () => {
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

  it("returns 0 when nothing matches", async () => {
    const { result, error } = await deleteExpiredTerminalJob(dbKey, { cutoff });
    expect(error).toBeUndefined();
    expect(result).toBe(0);
  });

  it("deletes expired terminal jobs and returns the count", async () => {
    await createJob(
      dbKey,
      jobParams({
        id: "job-old-succeeded",
        status: "succeeded",
        finished_at: expiredFinished,
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-old-dead",
        status: "dead",
        finished_at: expiredFinished,
        result: { terminal_reason: "exhausted" },
        original_request_id: "r-2",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-old-cancelled",
        status: "cancelled",
        finished_at: expiredFinished,
        result: { terminal_reason: "cancelled-by-admin" },
        original_request_id: "r-3",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-recent",
        status: "succeeded",
        finished_at: recentFinished,
        original_request_id: "r-4",
      }),
    );
    await createJob(
      dbKey,
      jobParams({
        id: "job-pending",
        status: "pending",
        original_request_id: "r-5",
      }),
    );

    const { result } = await deleteExpiredTerminalJob(dbKey, { cutoff });
    expect(result).toBe(3);

    for (const id of ["job-old-succeeded", "job-old-dead", "job-old-cancelled"]) {
      const { error } = await getByIdJob(dbKey, { id });
      expect(error).toBeInstanceOf(JobNotFoundError);
    }

    const recent = await getByIdJob(dbKey, { id: "job-recent" });
    assert(recent.result);
    expect(recent.result.status).toBe("succeeded");

    const pending = await getByIdJob(dbKey, { id: "job-pending" });
    assert(pending.result);
    expect(pending.result.status).toBe("pending");
  });
});
