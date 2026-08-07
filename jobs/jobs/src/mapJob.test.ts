import { describe, expect, it } from "vitest";
import type { JobEntity } from "@saflib/jobs-db";
import { mapJobToWire } from "./mapJob.ts";

const baseJob = {
  id: "job-1",
  status: "pending" as const,
  operationId: "purgeClaudeFilesMaintenance",
  request: {},
  userId: "admin-1",
  originalRequestId: "tick-1",
  enqueuedByOperationId: "cron:purgeClaudeFiles",
  parentJobId: null,
  runAt: new Date("2026-08-07T12:00:00.000Z"),
  dedupeKey: "cron:purgeClaudeFiles",
  concurrencyKey: null,
  priority: 0,
  attempt: 0,
  maxAttempts: 5,
  heartbeatAt: null,
  result: null,
  createdAt: new Date("2026-08-07T12:00:00.000Z"),
  updatedAt: new Date("2026-08-07T12:00:00.000Z"),
  startedAt: null,
  finishedAt: null,
};

describe("mapJobToWire", () => {
  it("maps cron authority without the embedded assertion", () => {
    const job = {
      ...baseJob,
      authority: {
        kind: "cron" as const,
        userId: "admin-1",
        cronJobName: "purgeClaudeFiles",
        assertion: { payload: "p", signature: "s", keyId: "k1" },
      },
    } satisfies JobEntity;

    expect(mapJobToWire(job).authority).toEqual({
      kind: "cron",
      userId: "admin-1",
      cronJobName: "purgeClaudeFiles",
    });
  });
});
