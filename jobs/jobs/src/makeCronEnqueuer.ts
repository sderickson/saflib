import { createInternalCaller, type InternalCaller } from "@saflib/express";
import type { Job, JobsServiceRequestBody } from "@saflib/jobs-spec";
import createError from "http-errors";
import { cronTriggerKey } from "./operations.ts";

export interface MakeCronEnqueuerOptions {
  /** Jobs app unix socket path. */
  jobsSocketPath: string;
}

/**
 * Params for one cron-tick enqueue. Kept free of `@saflib/cron` types so the
 * cron package can inject this function without a reverse dependency.
 */
export interface CronEnqueueParams {
  /** Cron job name (becomes `cron:{jobName}` callingOperationId / default dedupe). */
  jobName: string;
  /** Admin who enabled the cron job (`job_settings.enabled_by`). */
  enabledBy: string;
  /** Target background operationId from the job's declarative enqueue config. */
  operationId: string;
  request?: JobsServiceRequestBody["enqueueJob"]["request"];
  /** Defaults to `cron:{jobName}`. */
  dedupeKey?: string;
  priority?: number;
  /** Tick request id — assertion requestId / originalRequestId root. */
  requestId: string;
}

export interface CronEnqueueResult {
  job: Job;
  /** True when a live dedupe-key collision upserted an existing job (HTTP 200). */
  deduped: boolean;
}

export type CronEnqueuer = (
  params: CronEnqueueParams,
) => Promise<CronEnqueueResult>;

/**
 * Factory for the enqueue function injected into `@saflib/cron`.
 * Signs with `callingOperationId = cron:{jobName}` and passes `onBehalfOf`
 * cron authority for the enabling admin. Does not import `@saflib/cron`.
 */
export function makeCronEnqueuer(
  options: MakeCronEnqueuerOptions,
): CronEnqueuer {
  const caller: InternalCaller = createInternalCaller({
    socketPath: options.jobsSocketPath,
  });

  return async (params) => {
    const callingOperationId = cronTriggerKey(params.jobName);
    const dedupeKey = params.dedupeKey ?? callingOperationId;

    const request = params.request ?? {};
    const body: JobsServiceRequestBody["enqueueJob"] = {
      operationId: params.operationId,
      request: {
        ...request,
        body: request.body ?? {},
      },
      dedupeKey,
      priority: params.priority,
      onBehalfOf: {
        userId: params.enabledBy,
        authority: {
          kind: "cron",
          userId: params.enabledBy,
          cronJobName: params.jobName,
        },
      },
    };

    const response = await caller({
      operationId: "enqueueJob",
      method: "POST",
      path: "/jobs",
      body,
      asUser: {
        userId: params.enabledBy,
        // Enabling a cron job requires site-admin MFA; ticks deliver under that
        // recorded authority so site-admin-only maintenance routes accept them.
        mfaCompleted: true,
      },
      requestId: params.requestId,
      claims: {
        callingOperationId,
        originalRequestId: params.requestId,
      },
    });

    if (response.status !== 200 && response.status !== 201) {
      let message = `Cron enqueue failed with status ${response.status}`;
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
  };
}
