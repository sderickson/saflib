import express from "express";
import {
  createErrorMiddleware,
  createInternalMiddleware,
  createScopedMiddleware,
} from "@saflib/express";
import { jobsDb } from "@saflib/jobs-db";
import { jsonSpec } from "jobs-spec";
import type { DbKey } from "@saflib/drizzle";
import { buildOperationMap } from "../src/operations.ts";
import { jobsServiceStorage } from "../src/context.ts";
import type { JobsServiceOptions } from "../src/types.ts";
import { enqueueJobHandler } from "../routes/jobs/create.ts";

/**
 * Express app for the jobs internal surface (enqueue only).
 * Host with `startExpressServer(app, { socketPath })` so requests are
 * markInternal'd and assertion auth applies.
 */
export function createJobsApp(options: JobsServiceOptions): express.Express {
  let dbKey: DbKey;
  if (options.dbKey) {
    dbKey = options.dbKey;
  } else {
    dbKey = jobsDb.connect(options.dbOptions);
  }

  const operations = buildOperationMap(options.apiSpec);
  const context = {
    dbKey,
    triggerMap: options.triggerMap,
    operationConfig: options.operationConfig ?? {},
    operations,
  };

  const app = express();
  app.set("trust proxy", 1);
  app.use(createInternalMiddleware());

  app.use((_req, _res, next) => {
    jobsServiceStorage.run(context, () => {
      next();
    });
  });

  app.use(
    ...createScopedMiddleware({
      apiSpec: jsonSpec,
      enforceAuth: true,
    }),
  );
  app.post("/jobs", enqueueJobHandler);
  app.use(createErrorMiddleware());

  return app;
}
