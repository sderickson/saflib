/**
 * Cross-cutting queue semantics beyond isolated per-query tests.
 * Covers Phase 3 exit-criteria scenarios from jobs-m2.spec.md.
 */
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
import { JobSpawnCapExceededError } from "../../errors.ts";
import type { CreateJobParams } from "./create.ts";
import { jobQueries } from "./index.ts";
import { sql } from "drizzle-orm";

const t0 = new Date("2026-08-06T12:00:00.000Z");

function jobParams(
  overrides: Partial<CreateJobParams> & Pick<CreateJobParams, "id">,
): CreateJobParams {
  return {
    status: "pending",
    operationId: "jobsDemoStepB",
    request: { body: {} },
    userId: "user-1",
    authority: {
      kind: "request",
      userId: "user-1",
      requestId: "r-root",
      assertion: { payload: "p", signature: "s", keyId: "k1" },
    },
    originalRequestId: "r-chain",
    enqueuedByOperationId: "startJobsDemo",
    parentJobId: null,
    runAt: t0,
    dedupeKey: null,
    concurrencyKey: null,
    priority: 0,
    attempt: 0,
    maxAttempts: 5,
    heartbeatAt: null,
    result: null,
    createdAt: t0,
    updatedAt: t0,
    startedAt: null,
    finishedAt: null,
    spawnCap: 1000,
    ...overrides,
  };
}

describe("queue semantics (Phase 3 exit criteria)", () => {
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

  it("claim atomicity: two concurrent claimers, one winner", async () => {
    await jobQueries.createJob(dbKey, jobParams({ id: "job-1" }));

    const [a, b] = await Promise.all([
      jobQueries.claimNextJob(dbKey, { now: t0 }),
      jobQueries.claimNextJob(dbKey, { now: t0 }),
    ]);

    const claimed = [a.result, b.result].filter(Boolean);
    const empty = [a.result, b.result].filter((row) => row === null);
    expect(claimed).toHaveLength(1);
    expect(empty).toHaveLength(1);
    expect(claimed[0]!.id).toBe("job-1");
    expect(claimed[0]!.status).toBe("running");
    expect(claimed[0]!.attempt).toBe(1);
  });

  it("dedupe upsert: live key pushes runAt and refreshes request", async () => {
    const first = await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-1",
        dedupeKey: "matter:1:claim",
        request: { body: { n: 1 } },
      }),
    );
    assert(first.result);
    expect(first.result.deduped).toBe(false);

    const later = new Date("2026-08-06T13:00:00.000Z");
    const second = await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-2",
        dedupeKey: "matter:1:claim",
        request: { body: { n: 2 } },
        runAt: later,
        updatedAt: later,
      }),
    );
    assert(second.result);
    expect(second.result.deduped).toBe(true);
    expect(second.result.job.id).toBe("job-1");
    expect(second.result.job.request).toEqual({ body: { n: 2 } });
    expect(second.result.job.runAt).toEqual(later);

    const count = await jobQueries.countByOriginalRequestIdJob(dbKey, {
      originalRequestId: "r-chain",
    });
    expect(count.result).toBe(1);
  });

  it("inserts a follow-up when a running job holds the same dedupe_key (queued-only dedupe)", async () => {
    await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-running",
        status: "running",
        dedupeKey: "matter:1:auto-claim",
        attempt: 1,
        startedAt: t0,
        heartbeatAt: t0,
      }),
    );

    const followUp = await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-follow-up",
        dedupeKey: "matter:1:auto-claim",
        request: { body: { drain: true } },
      }),
    );
    assert(followUp.result);
    expect(followUp.result.deduped).toBe(false);
    expect(followUp.result.job.id).toBe("job-follow-up");
    expect(followUp.result.job.status).toBe("pending");

    const count = await jobQueries.countByOriginalRequestIdJob(dbKey, {
      originalRequestId: "r-chain",
    });
    expect(count.result).toBe(2);
  });

  it("concurrency-key exclusion: blocked while a peer is running", async () => {
    await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-running",
        status: "running",
        concurrencyKey: "matter:1",
        attempt: 1,
        startedAt: t0,
        heartbeatAt: t0,
      }),
    );
    await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-blocked",
        concurrencyKey: "matter:1",
        originalRequestId: "r-2",
      }),
    );
    await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-free",
        concurrencyKey: "matter:2",
        originalRequestId: "r-3",
      }),
    );

    const first = await jobQueries.claimNextJob(dbKey, { now: t0 });
    assert(first.result);
    expect(first.result.id).toBe("job-free");

    const second = await jobQueries.claimNextJob(dbKey, { now: t0 });
    expect(second.result).toBeNull();
  });

  it("stall recovery: retrying when attempts remain, dead when exhausted", async () => {
    const stale = new Date("2026-08-06T11:00:00.000Z");

    await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-retry",
        status: "running",
        attempt: 2,
        maxAttempts: 5,
        startedAt: stale,
        heartbeatAt: stale,
      }),
    );
    await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-dead",
        status: "running",
        attempt: 5,
        maxAttempts: 5,
        startedAt: stale,
        heartbeatAt: stale,
        originalRequestId: "r-2",
      }),
    );

    const { result } = await jobQueries.recoverStalledJob(dbKey, {
      ids: ["job-retry", "job-dead"],
      now: t0,
    });
    assert(result);
    const byId = Object.fromEntries(result.map((j) => [j.id, j]));
    expect(byId["job-retry"]!.status).toBe("retrying");
    expect(byId["job-dead"]!.status).toBe("dead");
    expect(byId["job-dead"]!.result).toEqual({
      terminalReason: "exhausted",
    });

    const reclaim = await jobQueries.claimNextJob(dbKey, { now: t0 });
    assert(reclaim.result);
    expect(reclaim.result.id).toBe("job-retry");
    expect(reclaim.result.attempt).toBe(3);
  });

  it("retention deletion: expired terminal rows removed, live rows kept", async () => {
    const cutoff = new Date("2026-08-01T00:00:00.000Z");
    const expired = new Date("2026-07-01T00:00:00.000Z");

    await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-old",
        status: "succeeded",
        finishedAt: expired,
      }),
    );
    await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-live",
        status: "pending",
        originalRequestId: "r-2",
      }),
    );

    const deleted = await jobQueries.deleteExpiredTerminalJob(dbKey, {
      cutoff,
    });
    expect(deleted.result).toBe(1);

    const missing = await jobQueries.getByIdJob(dbKey, { id: "job-old" });
    expect(missing.error).toBeDefined();

    const live = await jobQueries.getByIdJob(dbKey, { id: "job-live" });
    assert(live.result);
    expect(live.result.status).toBe("pending");
  });

  it("spawn cap: reject when chain count is already at cap", async () => {
    await jobQueries.createJob(
      dbKey,
      jobParams({ id: "job-1", spawnCap: 1 }),
    );

    const { result, error } = await jobQueries.createJob(
      dbKey,
      jobParams({ id: "job-2", spawnCap: 1 }),
    );
    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(JobSpawnCapExceededError);

    const count = await jobQueries.countByOriginalRequestIdJob(dbKey, {
      originalRequestId: "r-chain",
    });
    expect(count.result).toBe(1);
  });

  it("retry reset: dead → pending with attempt 0 and cleared result", async () => {
    await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-1",
        status: "dead",
        attempt: 5,
        finishedAt: t0,
        result: { statusCode: 500, terminalReason: "exhausted" },
      }),
    );

    const later = new Date("2026-08-06T13:00:00.000Z");
    const { result } = await jobQueries.retryByIdJob(dbKey, {
      id: "job-1",
      now: later,
    });
    assert(result);
    expect(result.status).toBe("pending");
    expect(result.attempt).toBe(0);
    expect(result.result).toBeNull();
    expect(result.finishedAt).toBeNull();
    expect(result.runAt).toEqual(later);

    const claimed = await jobQueries.claimNextJob(dbKey, { now: later });
    assert(claimed.result);
    expect(claimed.result.id).toBe("job-1");
    expect(claimed.result.attempt).toBe(1);
  });

  it("applies the job table migration on connect", async () => {
    const db = jobsDbManager.get(dbKey)!;
    const tables = await db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'job'`,
    );
    expect(tables.map((t) => t.name)).toContain("job");

    const indexes = await db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'job'`,
    );
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain("job_status_run_at_priority_idx");
    expect(indexNames).toContain("job_dedupe_key_queued_uidx");
  });
});
