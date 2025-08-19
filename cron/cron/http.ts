import express from "express";
import { cronRouter } from "./routes/index.ts";
import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import { cronDb } from "@saflib/cron-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { cronServiceStorage } from "./context.ts";
import type { JobsMap } from "./src/types.ts";
import type { DbOptions } from "@saflib/drizzle-sqlite3";

/**
 * Options to be passed when starting a cron service.
 */
export interface CronServiceOptions {
  /**
   * Options to be passed to the cron DB, if dbKey is not provided.
   */
  dbOptions?: DbOptions;
  /**
   * Key to be used to connect to the cron DB.
   */
  dbKey?: DbKey;
  /**
   * Map of job names to their configurations.
   */
  jobs: JobsMap;
}

export function createApp(options: CronServiceOptions) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(createGlobalMiddleware());
  app.use(createCronRouter(options));
  return app;
}

/**
 * Creates a router that your own Express app can include, in
 * order to serve cron API endpoints. These provide runtime
 * information and the ability do enable/disable cron jobs.
 * They are only accessible to admin users.
 */
export function createCronRouter(options: CronServiceOptions) {
  const router = express.Router();
  let dbKey: DbKey;
  if (options.dbKey) {
    dbKey = options.dbKey;
  } else {
    dbKey = cronDb.connect(options.dbOptions);
  }

  const context = { dbKey, jobs: options.jobs };

  // for some reason, types don't like me giving middleware as extra args
  // or an array, so I'm repeatedly calling "router.use('/cron', ...)"

  router.use("/cron", (_req, _res, next) => {
    cronServiceStorage.run(context, () => {
      next();
    });
  });
  router.use(cronRouter);
  router.use(createErrorMiddleware());
  return router;
}
