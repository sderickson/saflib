import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as previewWorkflowRunDiffOperationJsonSpec } from "@saflib/dev-site-spec/operations/previewWorkflowRunDiff";
import { previewWorkflowRunDiffHandler } from "./preview-diff.ts";

export function createWorkflowRunsRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/api/workflow-runs/:runId/preview-diff",
    ...createOperationScopedMiddleware(previewWorkflowRunDiffOperationJsonSpec, {
      enforceAuth: false,
    }),
    previewWorkflowRunDiffHandler,
  );

  return router;
}
