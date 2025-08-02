import express from "express";
import { cronRouter } from "./routes/index.ts";
import { createPreMiddleware, recommendedErrorHandlers } from "@saflib/express";
import { cronDb } from "@saflib/cron-db";
import { jsonSpec } from "@saflib/cron-spec";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { cronServiceStorage } from "./context.ts";
import type { JobsMap } from "./src/types.ts";
import type { DbOptions } from "@saflib/drizzle-sqlite3";
import { metricsRouter } from "@saflib/express";

export interface CronServiceOptions {
  subsystemName?: string;
  dbOptions?: DbOptions;
  dbKey?: DbKey;
  jobs: JobsMap;
}

export function createApp(options: CronServiceOptions) {
  let dbKey: DbKey;
  if (options.dbKey) {
    dbKey = options.dbKey;
  } else {
    dbKey = cronDb.connect(options.dbOptions);
  }

  const app = express();
  app.set("trust proxy", 1);
  app.use(metricsRouter);
  const context = { dbKey, jobs: options.jobs };
  app.use((_req, _res, next) => {
    cronServiceStorage.run(context, () => {
      next();
    });
  });
  app.use(
    createPreMiddleware({
      apiSpec: jsonSpec,
      subsystemName: options.subsystemName,
    }),
  );
  app.use("/cron", cronRouter);
  app.use(recommendedErrorHandlers);

  return app;
}
