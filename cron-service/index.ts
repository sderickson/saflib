import { startExpressServer } from "@saflib/express";
import { startJobs } from "./src/index.ts";
import { cronDb } from "@saflib/cron-db";
import { createApp } from "./http.ts";
import type { JobsMap } from "./src/types.ts";
import type { DbKey, DbOptions } from "@saflib/drizzle-sqlite3";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";

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
    startJobs(options.jobs, { subsystemName: "cron", dbKey });
    log.info("Starting express server...");
    const subsystemName = options.subsystemName
      ? options.subsystemName + ".cron"
      : "cron";
    const httpApp = createApp({
      dbKey,
      jobs: options.jobs,
      subsystemName,
    });
    startExpressServer(httpApp, {
      port: parseInt(typedEnv.CRON_SERVICE_HTTP_PORT, 10),
    });
    log.info("Cron service startup complete.");
  } catch (error) {
    logError(error);
  }
}
