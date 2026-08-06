import express from "express";
import {
  createErrorMiddleware,
  createScopedMiddleware,
} from "@saflib/express";
import type { DbKey } from "@saflib/drizzle";
import { jsonSpec } from "jobs-spec";
import { jobsServiceStorage } from "./context.ts";
import { listJobsHandler } from "../routes/jobs/list.ts";
import { getJobHandler } from "../routes/jobs/get.ts";
import { retryJobHandler } from "../routes/jobs/retry.ts";
import { cancelJobHandler } from "../routes/jobs/cancel.ts";
import { cancelJobsByOriginalRequestHandler } from "../routes/jobs/cancel-by-original-request.ts";

/**
 * Options for the admin jobs router mounted into a product public app.
 */
export interface CreateJobsRouterOptions {
  /** Shared jobs DB key (same as `runJobs` / `createJobsApp`). */
  dbKey: DbKey;
}

/**
 * Admin jobs router for monolith chrome (list/get/cancel-by-chain).
 * Mount **before** any router that ends with a catch-all 404 (e.g. cron),
 * and after product routers — same mount-last contract as `createCronRouter`.
 */
export function createJobsRouter(options: CreateJobsRouterOptions): express.Router {
  const router = express.Router();

  const context = {
    dbKey: options.dbKey,
    triggerMap: {},
    operationConfig: {},
    operations: new Map(),
  };

  router.use((_req, _res, next) => {
    jobsServiceStorage.run(context, () => {
      next();
    });
  });

  router.use(
    "/jobs",
    ...createScopedMiddleware({
      apiSpec: jsonSpec,
      enforceAuth: true,
    }),
  );

  router.get("/jobs", listJobsHandler);
  router.post(
    "/jobs/cancel-by-original-request",
    cancelJobsByOriginalRequestHandler,
  );
  router.post("/jobs/:id/retry", retryJobHandler);
  router.post("/jobs/:id/cancel", cancelJobHandler);
  router.get("/jobs/:id", getJobHandler);

  router.use(createErrorMiddleware());
  return router;
}
