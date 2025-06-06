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
}

/**
 * Map of job names to their configurations.
 */
export type JobsMap = Record<string, JobConfig>;
