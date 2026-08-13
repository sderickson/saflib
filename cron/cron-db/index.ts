export * from "./errors.ts";

export { getAll } from "./queries/job-settings/get-all.ts";
export { getByName } from "./queries/job-settings/get-by-name.ts";
export { setEnabled } from "./queries/job-settings/set-enabled.ts";
export { setLastRunStatus } from "./queries/job-settings/set-last-run-status.ts";
export type { GetAllResult } from "./queries/job-settings/get-all.ts";
export type { GetByNameResult } from "./queries/job-settings/get-by-name.ts";
export type { SetEnabledResult } from "./queries/job-settings/set-enabled.ts";
export type { SetLastRunStatusResult } from "./queries/job-settings/set-last-run-status.ts";
export type { JobSetting } from "./schema.ts";
import { cronDbManager } from "./instances.ts";

/**
 * For managing connections to the cron database.
 */
export const cronDb = cronDbManager.publicInterface();
