/**
 * Data passed to the error callback.
 */
export interface CustomLogErrorMeta {
  jobName: string;
}

/**
 * Callback for handling when a job throws an error.
 */
export type CustomLogError = (
  error: Error,
  meta: CustomLogErrorMeta,
) => boolean;

/**
 * Static request payload for the operation a cron tick enqueues.
 * Dynamic fan-out belongs in the target handler.
 */
export interface CronJobRequest {
  path_params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
}

/**
 * Configuration for a single cron job. Cron ticks only enqueue; work runs
 * through the target background operation.
 */
export interface JobConfig {
  /** Cron schedule string (e.g., '* * * * *') */
  schedule: string;
  /** The single job this schedule enqueues. */
  enqueue: {
    operationId: string;
    /** Static request: { path_params?, query?, body? }. */
    request?: CronJobRequest;
    /** Defaults to `cron:{jobName}`. */
    dedupeKey?: string;
    priority?: number;
  };
}

/**
 * Map of job names to their configurations.
 */
export type JobsMap = Record<string, JobConfig>;

/**
 * Params for one cron-tick enqueue. Mirrored by `@saflib/jobs` `makeCronEnqueuer`
 * so `@saflib/cron-http` does not import `@saflib/jobs`.
 */
export interface CronEnqueueParams {
  /** Cron job name (becomes `cron:{jobName}` callingOperationId / default dedupe). */
  jobName: string;
  /** Admin who enabled the cron job (`job_settings.enabled_by`). */
  enabledBy: string;
  /** Target background operationId from the job's declarative enqueue config. */
  operationId: string;
  request?: CronJobRequest;
  /** Defaults to `cron:{jobName}`. */
  dedupeKey?: string;
  priority?: number;
  /** Tick request id — assertion requestId / originalRequestId root. */
  requestId: string;
}

export interface CronEnqueueResult {
  /** True when a live dedupe-key collision upserted an existing job. */
  deduped?: boolean;
}

export type CronEnqueuer = (
  params: CronEnqueueParams,
) => Promise<CronEnqueueResult | unknown>;
