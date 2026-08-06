import type { JobEntity } from "jobs-db";
import type { Job } from "jobs-spec";

/**
 * Maps a jobs-db row to the wire `Job` (omits heartbeat/updatedAt; strips the
 * embedded enqueue assertion from `authority`).
 */
export function mapJobToWire(job: JobEntity): Job {
  let authority: Job["authority"];
  if (job.authority.kind === "request") {
    authority = {
      kind: "request",
      userId: job.authority.userId,
      requestId: job.authority.requestId,
    };
  } else if (job.authority.kind === "importer") {
    authority = {
      kind: "importer",
      userId: job.authority.userId,
      importerId: job.authority.importerId,
    };
  } else {
    // M2 wire schema has no cron kind yet; surface as request-shaped evidence.
    authority = {
      kind: "request",
      userId: job.authority.userId,
      requestId: job.authority.cronJobName,
    };
  }

  return {
    id: job.id,
    status: job.status,
    operationId: job.operationId,
    request: job.request,
    userId: job.userId,
    authority,
    originalRequestId: job.originalRequestId,
    enqueuedByOperationId: job.enqueuedByOperationId,
    parentJobId: job.parentJobId,
    runAt: job.runAt.toISOString(),
    dedupeKey: job.dedupeKey,
    concurrencyKey: job.concurrencyKey,
    priority: job.priority,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
    result: job.result,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}
