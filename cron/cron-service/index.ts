import { startJobs } from "./src/index.ts";
import { cronDb } from "@saflib/cron-db";
import { createCronRouter } from "./http.ts";
import type { JobsMap } from "./src/types.ts";
import type { DbKey, DbOptions } from "@saflib/drizzle-sqlite3";
import { makeSubsystemReporters } from "@saflib/node";

export { createCronRouter };

export type { JobsMap, CustomLogError } from "./src/types.ts";

export interface CronServiceOptions {
  subsystemName?: string;
  dbOptions?: DbOptions;
  dbKey?: DbKey;
  jobs: JobsMap;
}

export function main(options: CronServiceOptions) {
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
