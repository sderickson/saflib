import { createInternalCaller, type InternalCaller } from "@saflib/express";
import { getSafContextWithAuth } from "@saflib/node";
import type { Job, JobsServiceRequestBody } from "jobs-spec";
import createError from "http-errors";

export interface EnqueueParams {
  operationId: string;
  request?: JobsServiceRequestBody["enqueueJob"]["request"];
  runAt?: string;
  delayMs?: number;
  dedupeKey?: string | null;
  concurrencyKey?: string | null;
  priority?: number;
}

export interface EnqueueOnBehalfOfParams extends EnqueueParams {
  userId: string;
  authority: NonNullable<
    JobsServiceRequestBody["enqueueJob"]["onBehalfOf"]
  >["authority"];
}

export interface EnqueueResult {
  job: Job;
  /** True when a live dedupe-key collision upserted an existing job (HTTP 200). */
  deduped: boolean;
}

export interface EnqueueClientOptions {
  /** Jobs app unix socket. Defaults to `SAF_JOBS_SOCKET` or `/tmp/saf-jobs-internal.sock`. */
  socketPath?: string;
}

function resolveJobsSocketPath(options?: EnqueueClientOptions): string {
  return (
    options?.socketPath ??
    process.env.SAF_JOBS_SOCKET ??
    process.env.DAEMON_SERVICE_JOBS_SOCKET ?? // legacy alias
    "/tmp/saf-jobs-internal.sock"
  );
}

const callerBySocketPath = new Map<string, InternalCaller>();

function getEnqueueCaller(socketPath: string): InternalCaller {
  let caller = callerBySocketPath.get(socketPath);
  if (!caller) {
    caller = createInternalCaller({ socketPath });
    callerBySocketPath.set(socketPath, caller);
  }
  return caller;
}

/** @internal test helper — close cached callers between tests. */
export async function _resetEnqueueCallersForTests(): Promise<void> {
  await Promise.all(
    [...callerBySocketPath.values()].map((caller) => caller.close()),
  );
  callerBySocketPath.clear();
}

async function postEnqueue(
  body: JobsServiceRequestBody["enqueueJob"],
  options?: EnqueueClientOptions,
): Promise<EnqueueResult> {
  const ctx = getSafContextWithAuth();
  const userId = ctx.auth.userId;
  if (!userId) {
    throw createError(401, "Authenticated user required to enqueue");
  }

  const socketPath = resolveJobsSocketPath(options);
  const caller = getEnqueueCaller(socketPath);

  const claims: Record<string, string> = {
    callingOperationId: ctx.operationName,
    originalRequestId: ctx.originalRequestId ?? ctx.requestId ?? "",
  };
  if (ctx.jobId) {
    claims.jobId = ctx.jobId;
  }

  const response = await caller({
    operationId: "enqueueJob",
    method: "POST",
    path: "/jobs",
    body,
    asUser: {
      userId,
      mfaCompleted: ctx.auth.mfaCompleted,
    },
    requestId: ctx.requestId,
    claims,
  });

  if (response.status !== 200 && response.status !== 201) {
    let message = `Enqueue failed with status ${response.status}`;
    try {
      const errBody = (await response.json()) as { message?: string };
      if (errBody.message) {
        message = errBody.message;
      }
    } catch {
      // ignore parse errors
    }
    throw createError(response.status, message);
  }

  const payload = (await response.json()) as { job: Job };
  return {
    job: payload.job,
    deduped: response.status === 200,
  };
}

/**
 * Enqueue a background job under the current request's acting user.
 * Derives callingOperationId / originalRequestId from `getSafContext()`.
 */
export async function enqueue(
  params: EnqueueParams,
  options?: EnqueueClientOptions,
): Promise<EnqueueResult> {
  return postEnqueue(
    {
      operationId: params.operationId,
      request: params.request ?? {},
      runAt: params.runAt,
      delayMs: params.delayMs,
      dedupeKey: params.dedupeKey,
      concurrencyKey: params.concurrencyKey,
      priority: params.priority,
    },
    options,
  );
}

/**
 * Enqueue under an explicit user + authority evidence (webhooks, etc.).
 */
export async function enqueueOnBehalfOf(
  params: EnqueueOnBehalfOfParams,
  options?: EnqueueClientOptions,
): Promise<EnqueueResult> {
  return postEnqueue(
    {
      operationId: params.operationId,
      request: params.request ?? {},
      runAt: params.runAt,
      delayMs: params.delayMs,
      dedupeKey: params.dedupeKey,
      concurrencyKey: params.concurrencyKey,
      priority: params.priority,
      onBehalfOf: {
        userId: params.userId,
        authority: params.authority,
      },
    },
    options,
  );
}
