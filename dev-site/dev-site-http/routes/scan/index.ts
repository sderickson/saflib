import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as executeScanOperationJsonSpec } from "@saflib/dev-site-spec/operations/executeScan";
import { executeScanHandler } from "./execute.ts";

export function createScanRouter(): IRouter {
  const router = express.Router();

  router.post(
    "/scan",
    ...createOperationScopedMiddleware(executeScanOperationJsonSpec, {
      enforceAuth: false,
    }),
    executeScanHandler,
  );

  return router;
}
