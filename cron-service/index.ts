import { startExpressServer } from "@saflib/express";
import { startJobs } from "./src/index.ts";
import { cronDb } from "@saflib/cron-db";
import { createApp } from "./http.ts";
import type { JobsMap } from "./src/types.ts";
import type { DbKey, DbOptions } from "@saflib/drizzle-sqlite3";
import { createLogger } from "@saflib/node";

export type { JobsMap } from "./src/types.ts";

export interface CronServiceOptions {
  serviceName?: string;
  dbOptions?: DbOptions;
  dbKey?: DbKey;
  jobs: JobsMap;
}

export function main(options: CronServiceOptions) {
  const logger = createLogger({
    serviceName: "cron",
    operationName: "main",
    requestId: "",
  });
  logger.info("Starting cron service...");
  logger.info("Connecting to cron DB...");
  const dbKey = options.dbKey ?? cronDb.connect(options.dbOptions);
  const serviceName = options.serviceName ?? "cron";
  logger.info("Starting jobs...");
  startJobs(options.jobs, { serviceName, dbKey });
  logger.info("Starting express server...");
  const httpApp = createApp({ dbKey, jobs: options.jobs, serviceName });
  startExpressServer(httpApp);
  logger.info("Cron service startup complete.");
}
