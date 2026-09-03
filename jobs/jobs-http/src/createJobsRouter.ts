import express from "express";
import {
  createErrorMiddleware,
  createScopedMiddleware,
} from "@saflib/express";
import type { DbKey } from "@saflib/drizzle";
import { jsonSpec } from "@saflib/jobs-spec";
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
 * Only handles `/jobs/*` — other paths fall through so sibling chrome routers
 * (e.g. cron) can run. Error middleware is scoped to `/jobs` for the same reason.
 */
export function createJobsRouter(
  options: CreateJobsRouterOptions,
): express.Router {
  const router = express.Router();

  const context = {
    dbKey: options.dbKey,
    triggerMap: {},
    operationConfig: {},
    operations: new Map(),
  };

  const jobsRouter = express.Router();

  jobsRouter.use((_req, _res, next) => {
    jobsServiceStorage.run(context, () => {
      next();
    });
  });

  jobsRouter.use(
    ...createScopedMiddleware({
      apiSpec: jsonSpec,
      enforceAuth: true,
    }),
  );

  jobsRouter.get("/", listJobsHandler);
  jobsRouter.post("/cancel-by-original-request", cancelJobsByOriginalRequestHandler);
  jobsRouter.post("/:id/retry", retryJobHandler);
  jobsRouter.post("/:id/cancel", cancelJobHandler);
  jobsRouter.get("/:id", getJobHandler);

  jobsRouter.use(createErrorMiddleware());

  router.use("/jobs", jobsRouter);

  return router;
}
