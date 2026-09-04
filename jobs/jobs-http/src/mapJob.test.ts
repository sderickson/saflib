import { describe, expect, it } from "vitest";
import type { JobEntity } from "@saflib/jobs-db";
import { mapJobToWire } from "./mapJob.ts";

const baseJob = {
  id: "job-1",
  status: "pending" as const,
  operation_id: "purgeClaudeFilesMaintenance",
  request: {},
  user_id: "admin-1",
  original_request_id: "tick-1",
  enqueued_by_operation_id: "cron:purgeClaudeFiles",
  parent_job_id: null,
  run_at: new Date("2026-08-07T12:00:00.000Z"),
  dedupe_key: "cron:purgeClaudeFiles",
  concurrency_key: null,
  priority: 0,
  attempt: 0,
  max_attempts: 5,
  heartbeat_at: null,
  result: null,
  created_at: new Date("2026-08-07T12:00:00.000Z"),
  updated_at: new Date("2026-08-07T12:00:00.000Z"),
  started_at: null,
  finished_at: null,
};

describe("mapJobToWire", () => {
  it("maps cron authority without the embedded assertion", () => {
    const job = {
      ...baseJob,
      authority: {
        kind: "cron" as const,
        user_id: "admin-1",
        cron_job_name: "purgeClaudeFiles",
        assertion: { payload: "p", signature: "s", key_id: "k1" },
      },
    } satisfies JobEntity;

    expect(mapJobToWire(job).authority).toEqual({
      kind: "cron",
      user_id: "admin-1",
      cron_job_name: "purgeClaudeFiles",
    });
  });

  it("maps resource authority without the embedded assertion", () => {
    const job = {
      ...baseJob,
      authority: {
        kind: "resource" as const,
        user_id: "admin-1",
        resource_id: "webhook-1",
        assertion: { payload: "p", signature: "s", key_id: "k1" },
      },
    } satisfies JobEntity;

    expect(mapJobToWire(job).authority).toEqual({
      kind: "resource",
      user_id: "admin-1",
      resource_id: "webhook-1",
    });
  });

  it("serializes date fields to ISO strings", () => {
    const job = {
      ...baseJob,
      authority: {
        kind: "request" as const,
        user_id: "admin-1",
        request_id: "tick-1",
        assertion: { payload: "p", signature: "s", key_id: "k1" },
      },
      started_at: new Date("2026-08-07T12:01:00.000Z"),
      finished_at: new Date("2026-08-07T12:02:00.000Z"),
    } satisfies JobEntity;

    const wire = mapJobToWire(job);
    expect(wire.run_at).toBe("2026-08-07T12:00:00.000Z");
    expect(wire.created_at).toBe("2026-08-07T12:00:00.000Z");
    expect(wire.started_at).toBe("2026-08-07T12:01:00.000Z");
    expect(wire.finished_at).toBe("2026-08-07T12:02:00.000Z");
    expect(wire).not.toHaveProperty("heartbeat_at");
    expect(wire).not.toHaveProperty("updated_at");
  });
});
