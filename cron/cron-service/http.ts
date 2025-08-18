import express from "express";
import { cronRouter } from "./routes/index.ts";
import {
  createScopedMiddleware,
  recommendedErrorHandlers,
} from "@saflib/express";
import { cronDb } from "@saflib/cron-db";
import { jsonSpec } from "@saflib/cron-spec";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { cronServiceStorage } from "./context.ts";
import type { JobsMap } from "./src/types.ts";
import type { DbOptions } from "@saflib/drizzle-sqlite3";
import { metricsRouter, metricsMiddleware } from "@saflib/express";

export interface CronServiceOptions {
  subsystemName?: string;
  dbOptions?: DbOptions;
  dbKey?: DbKey;
  jobs: JobsMap;
}

export function createApp(options: CronServiceOptions) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(metricsRouter);
  app.use(metricsMiddleware);
  app.use(createCronRouter(options));
  return app;
}

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
  router.use(
    "/cron",
    createScopedMiddleware({
      apiSpec: jsonSpec,
    }),
  );
  router.use("/cron", cronRouter);
  router.use("/cron", recommendedErrorHandlers);
  return router;
}
