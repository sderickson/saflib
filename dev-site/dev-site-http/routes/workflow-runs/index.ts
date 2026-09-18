import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as previewWorkflowRunDiffOperationJsonSpec } from "@saflib/dev-site-spec/operations/previewWorkflowRunDiff";
import { operationJsonSpec as reflectWorkflowRunDiffOperationJsonSpec } from "@saflib/dev-site-spec/operations/reflectWorkflowRunDiff";
import { previewWorkflowRunDiffHandler } from "./preview-diff.ts";
import { reflectWorkflowRunDiffHandler } from "./reflect-diff.ts";

export function createWorkflowRunsRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/api/workflow-runs/:runId/preview-diff",
    ...createOperationScopedMiddleware(previewWorkflowRunDiffOperationJsonSpec, {
      enforceAuth: false,
    }),
    previewWorkflowRunDiffHandler,
  );
  router.get(
    "/api/workflow-runs/:runId/reflect-diff",
    ...createOperationScopedMiddleware(reflectWorkflowRunDiffOperationJsonSpec, {
      enforceAuth: false,
    }),
    reflectWorkflowRunDiffHandler,
  );

  return router;
}
