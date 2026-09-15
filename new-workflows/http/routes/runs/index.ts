import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as createWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/createWorkflowRun";
import { operationJsonSpec as getWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/getWorkflowRun";
import { operationJsonSpec as advanceWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/advanceWorkflowRun";
import { operationJsonSpec as listWorkflowRunLogsOperationJsonSpec } from "@saflib/new-workflows-spec/operations/listWorkflowRunLogs";
import { createWorkflowRunHandler } from "./create.ts";
import { getWorkflowRunHandler } from "./get.ts";
import { advanceWorkflowRunHandler } from "./advance.ts";
import { listWorkflowRunLogsHandler } from "./logs.ts";
import { streamWorkflowRunEventsHandler } from "./events.ts";

export function createRunsRouter(): IRouter {
  const router = express.Router();

  router.post(
    "/workflows/:id/runs",
    ...createOperationScopedMiddleware(createWorkflowRunOperationJsonSpec, {
      enforceAuth: false,
    }),
    createWorkflowRunHandler,
  );

  router.get(
    "/runs/:runId",
    ...createOperationScopedMiddleware(getWorkflowRunOperationJsonSpec, {
      enforceAuth: false,
    }),
    getWorkflowRunHandler,
  );

  router.post(
    "/runs/:runId/advance",
    ...createOperationScopedMiddleware(advanceWorkflowRunOperationJsonSpec, {
      enforceAuth: false,
    }),
    advanceWorkflowRunHandler,
  );

  router.get(
    "/runs/:runId/logs",
    ...createOperationScopedMiddleware(listWorkflowRunLogsOperationJsonSpec, {
      enforceAuth: false,
    }),
    listWorkflowRunLogsHandler,
  );

  // SSE — not modeled as an OpenAPI operation (text/event-stream doesn't
  // fit request/response validation), so no scoped middleware here.
  router.get("/runs/:runId/events", streamWorkflowRunEventsHandler);

  return router;
}
