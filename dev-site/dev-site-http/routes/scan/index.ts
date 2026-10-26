import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as executeScanOperationJsonSpec } from "@saflib/dev-site-spec/operations/executeScan";
import { operationJsonSpec as listScanJobsOperationJsonSpec } from "@saflib/dev-site-spec/operations/listScanJobs";
import { executeScanHandler } from "./execute.ts";
import { listScanJobsHandler } from "./list-jobs.ts";

export function createScanRouter(): IRouter {
  const router = express.Router();

  router.post(
    "/api/scan",
    ...createOperationScopedMiddleware(executeScanOperationJsonSpec),
    executeScanHandler,
  );
  router.get(
    "/api/scan/jobs",
    ...createOperationScopedMiddleware(listScanJobsOperationJsonSpec),
    listScanJobsHandler,
  );

  return router;
}
