import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as listWorkflowsOperationJsonSpec } from "@saflib/new-workflows-spec/operations/listWorkflows";
import { listWorkflowsHandler } from "./list.ts";

export function createWorkflowsRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/api/workflows",
    ...createOperationScopedMiddleware(listWorkflowsOperationJsonSpec, {
      enforceAuth: false,
    }),
    listWorkflowsHandler,
  );

  return router;
}
