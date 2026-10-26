import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as getWorkflowDriveOperationJsonSpec } from "@saflib/new-workflows-spec/operations/getWorkflowDrive";
import { operationJsonSpec as stopWorkflowDriveOperationJsonSpec } from "@saflib/new-workflows-spec/operations/stopWorkflowDrive";
import { getWorkflowDriveHandler } from "./get.ts";
import { stopWorkflowDriveHandler } from "./stop.ts";

export function createDriveRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/drive",
    ...createOperationScopedMiddleware(getWorkflowDriveOperationJsonSpec),
    getWorkflowDriveHandler,
  );

  router.post(
    "/drive/stop",
    ...createOperationScopedMiddleware(stopWorkflowDriveOperationJsonSpec),
    stopWorkflowDriveHandler,
  );

  return router;
}
