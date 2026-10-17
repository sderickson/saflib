import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as previewWorkflowRunDiffOperationJsonSpec } from "@saflib/dev-site-spec/operations/previewWorkflowRunDiff";
import { operationJsonSpec as reflectWorkflowRunDiffOperationJsonSpec } from "@saflib/dev-site-spec/operations/reflectWorkflowRunDiff";
import { operationJsonSpec as previewWorkflowDiffOperationJsonSpec } from "@saflib/dev-site-spec/operations/previewWorkflowDiff";
import { previewWorkflowRunDiffHandler } from "./preview-diff.ts";
import { reflectWorkflowRunDiffHandler } from "./reflect-diff.ts";
import { previewWorkflowDiffHandler } from "./preview-workflow-diff.ts";

export function createWorkflowRunsRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/api/workflow-runs/:runId/preview-diff",
    ...createOperationScopedMiddleware(previewWorkflowRunDiffOperationJsonSpec),
    previewWorkflowRunDiffHandler,
  );
  router.get(
    "/api/workflow-runs/:runId/reflect-diff",
    ...createOperationScopedMiddleware(reflectWorkflowRunDiffOperationJsonSpec),
    reflectWorkflowRunDiffHandler,
  );
  router.post(
    "/api/workflows/:id/preview-diff",
    ...createOperationScopedMiddleware(previewWorkflowDiffOperationJsonSpec),
    previewWorkflowDiffHandler,
  );

  return router;
}
