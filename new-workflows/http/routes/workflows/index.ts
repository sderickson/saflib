import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as listWorkflowsOperationJsonSpec } from "@saflib/new-workflows-spec/operations/listWorkflows";
import { operationJsonSpec as getWorkflowStepsOperationJsonSpec } from "@saflib/new-workflows-spec/operations/getWorkflowSteps";
import { listWorkflowsHandler } from "./list.ts";
import { getWorkflowStepsHandler } from "./steps.ts";

export function createWorkflowsRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/workflows",
    ...createOperationScopedMiddleware(listWorkflowsOperationJsonSpec, {
      enforceAuth: false,
    }),
    listWorkflowsHandler,
  );

  router.get(
    "/workflows/:id/steps",
    ...createOperationScopedMiddleware(getWorkflowStepsOperationJsonSpec, {
      enforceAuth: false,
    }),
    getWorkflowStepsHandler,
  );

  return router;
}
