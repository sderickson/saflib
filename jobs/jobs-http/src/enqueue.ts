import { createInternalCaller, type InternalCaller } from "@saflib/express";
import { getSafContextWithAuth } from "@saflib/node";
import type { Job, JobsServiceRequestBody } from "@saflib/jobs-spec";
import createError from "http-errors";

export interface EnqueueParams {
  operation_id: string;
  request?: JobsServiceRequestBody["enqueueJob"]["request"];
  run_at?: string;
  delay_ms?: number;
  dedupe_key?: string | null;
  concurrency_key?: string | null;
  priority?: number;
}

export interface EnqueueOnBehalfOfParams extends EnqueueParams {
  user_id: string;
  authority: NonNullable<
    JobsServiceRequestBody["enqueueJob"]["on_behalf_of"]
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
      operation_id: params.operation_id,
      request: params.request ?? {},
      run_at: params.run_at,
      delay_ms: params.delay_ms,
      dedupe_key: params.dedupe_key,
      concurrency_key: params.concurrency_key,
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
      operation_id: params.operation_id,
      request: params.request ?? {},
      run_at: params.run_at,
      delay_ms: params.delay_ms,
      dedupe_key: params.dedupe_key,
      concurrency_key: params.concurrency_key,
      priority: params.priority,
      on_behalf_of: {
        user_id: params.user_id,
        authority: params.authority,
      },
    },
    options,
  );
}
