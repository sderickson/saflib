import { startExpressServer } from "@saflib/express";
import { startJobs } from "./src/index.ts";
import { cronDb } from "@saflib/cron-db";
import { createApp, type CronServiceOptions } from "./http.ts";

export type { JobsMap } from "./src/types.ts";

export function main(options: CronServiceOptions) {
  const dbKey = options.dbKey ?? cronDb.connect(options.dbOptions);
  startJobs(options.jobs, dbKey);
  const httpApp = createApp({ dbKey, jobs: options.jobs });
  startExpressServer(httpApp);
}
