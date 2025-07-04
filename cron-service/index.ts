import { startExpressServer } from "@saflib/express";
import { startJobs } from "./src/index.ts";
import { cronDb } from "@saflib/cron-db";
import { createApp } from "./http.ts";
import type { JobsMap } from "./src/types.ts";
import type { DbKey, DbOptions } from "@saflib/drizzle-sqlite3";

export type { JobsMap } from "./src/types.ts";

export interface CronServiceOptions {
  serviceName?: string;
  dbOptions?: DbOptions;
  dbKey?: DbKey;
  jobs: JobsMap;
}

export function main(options: CronServiceOptions) {
  const dbKey = options.dbKey ?? cronDb.connect(options.dbOptions);
  const serviceName = options.serviceName ?? "cron";
  startJobs(options.jobs, { serviceName, dbKey });
  const httpApp = createApp({ dbKey, jobs: options.jobs, serviceName });
  startExpressServer(httpApp);
}
