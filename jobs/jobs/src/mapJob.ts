import type { JobEntity } from "@saflib/jobs-db";
import type { Job } from "@saflib/jobs-spec";

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
  } else if (job.authority.kind === "cron") {
    authority = {
      kind: "cron",
      userId: job.authority.userId,
      cronJobName: job.authority.cronJobName,
    };
  } else {
    const _exhaustive: never = job.authority;
    throw new Error(
      `Unknown job authority kind: ${(_exhaustive as { kind: string }).kind}`,
    );
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
