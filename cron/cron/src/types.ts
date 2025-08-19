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
 * Configuration for a single cron job.
 */
export interface JobConfig {
  /** Cron schedule string (e.g., '* * * * *') */
  schedule: string;
  /** The async function to execute when the job runs. */
  handler: (reqId: string) => Promise<any>;
}

/**
 * Map of job names to their configurations.
 */
export type JobsMap = Record<string, JobConfig>;
