import { startJobs } from "./src/index.ts";
import { cronDb } from "@saflib/cron-db";
import { createCronRouter } from "./http.ts";
import { makeSubsystemReporters } from "@saflib/node";
import type { CronServiceOptions } from "./http.ts";
import type { DbKey } from "@saflib/drizzle";

export type { CronServiceOptions };

export { createCronRouter };

export type {
  JobsMap,
  CustomLogError,
  JobConfig,
  CustomLogErrorMeta,
} from "./src/types.ts";

/**
 * Runs the cron jobs until the process is killed. Returns a DB key you can
 * provide to the cron router to share the same connection.
 */
export function runCron(options: CronServiceOptions): DbKey | undefined {
  const { log, logError } = makeSubsystemReporters("init", "runCron");
  try {
    log.info("Starting cron service...");
    log.info("Connecting to cron DB...");
    const dbKey = options.dbKey ?? cronDb.connect(options.dbOptions);
    log.info("Starting jobs...");
    startJobs(options.jobs, { dbKey });
    log.info("Cron service startup complete.");
    return dbKey;
  } catch (error) {
    logError(error);
  }
}
