import { startJobs } from "./src/index.ts";
import { cronDb } from "@saflib/cron-db";
import { createCronRouter } from "./http.ts";
import { makeSubsystemReporters } from "@saflib/node";
import type { CronServiceOptions } from "./http.ts";
import type { CronJob } from "cron";
import { cronServiceStorage } from "./context.ts";

export type { CronServiceOptions };

export { createCronRouter };

export type {
  JobsMap,
  CustomLogError,
  JobConfig,
  CustomLogErrorMeta,
} from "./src/types.ts";

/**
 * Runs the cron jobs until the process is killed. Returns an array of cron jobs.
 */
export async function runCron(
  options: CronServiceOptions,
): Promise<CronJob[] | undefined> {
  const { log, logError } = makeSubsystemReporters("init", "runCron");
  try {
    log.info("Starting cron service...");
    log.info("Connecting to cron DB...");
    const dbKey = options.dbKey ?? cronDb.connect(options.dbOptions);
    const result = await cronServiceStorage.run(
      { dbKey, jobs: options.jobs },
      async () => {
        log.info("Starting jobs...");
        const jobs = await startJobs(options.jobs, { dbKey });
        log.info("Cron service startup complete.");
        return jobs;
      },
    );
    return result;
  } catch (error) {
    logError(error);
  }
}
