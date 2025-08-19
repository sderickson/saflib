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
  /** Default enabled state (primarily for initial setup, DB state overrides). */
  enabled: boolean;
  /** Optional job execution timeout in seconds (defaults to 10 if not provided). */
  timeoutSeconds?: number;
  /** Optional error reporter for the job. Returns true if the error was logged. */
  customLogError?: CustomLogError;
}

/**
 * Map of job names to their configurations.
 */
export type JobsMap = Record<string, JobConfig>;
