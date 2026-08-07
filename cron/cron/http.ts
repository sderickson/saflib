import express from "express";
import { cronRouter } from "./routes/index.ts";
import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import { cronDb } from "@saflib/cron-db";
import type { DbKey } from "@saflib/drizzle";
import { cronServiceStorage } from "./context.ts";
import type { CronEnqueuer, JobsMap } from "./src/types.ts";
import type { DbOptions } from "@saflib/drizzle";

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
  /**
   * Enqueues a background job for a cron tick. Typically `makeCronEnqueuer`
   * from `@saflib/jobs`, wired by the product monolith.
   */
  enqueueJob: CronEnqueuer;
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
 *
 * Only handles `/cron/*` — other paths fall through so sibling chrome routers
 * (e.g. jobs admin) can run when mounted after this router.
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

  const cronRouterMount = express.Router();

  cronRouterMount.use((_req, _res, next) => {
    cronServiceStorage.run(context, () => {
      next();
    });
  });
  cronRouterMount.use(cronRouter);
  cronRouterMount.use(createErrorMiddleware());

  router.use("/cron", cronRouterMount);

  return router;
}
