import { startJobs } from "./src/index.ts";
import { cronDb } from "@saflib/cron-db";
import { createCronRouter } from "./http.ts";
import { makeSubsystemReporters } from "@saflib/node";
import type { CronServiceOptions } from "./http.ts";

export type { CronServiceOptions };

export { createCronRouter };

export type {
  JobsMap,
  CustomLogError,
  JobConfig,
  CustomLogErrorMeta,
} from "./src/types.ts";

/**
 * Runs the cron jobs until the process is killed.
 */
export function runCron(options: CronServiceOptions) {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting cron service...");
    log.info("Connecting to cron DB...");
    const dbKey = options.dbKey ?? cronDb.connect(options.dbOptions);
    log.info("Starting jobs...");
    startJobs(options.jobs, { dbKey });
    log.info("Cron service startup complete.");
  } catch (error) {
    logError(error);
  }
}
