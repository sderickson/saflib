import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as createWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/createWorkflowRun";
import { operationJsonSpec as listWorkflowRunsOperationJsonSpec } from "@saflib/new-workflows-spec/operations/listWorkflowRuns";
import { operationJsonSpec as getWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/getWorkflowRun";
import { operationJsonSpec as advanceWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/advanceWorkflowRun";
import { operationJsonSpec as gotoWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/gotoWorkflowRun";
import { operationJsonSpec as cancelWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/cancelWorkflowRun";
import { operationJsonSpec as listWorkflowRunLogsOperationJsonSpec } from "@saflib/new-workflows-spec/operations/listWorkflowRunLogs";
import { operationJsonSpec as getWorkflowRunStepsOperationJsonSpec } from "@saflib/new-workflows-spec/operations/getWorkflowRunSteps";
import { operationJsonSpec as getWorkflowRunStepTreeOperationJsonSpec } from "@saflib/new-workflows-spec/operations/getWorkflowRunStepTree";
import { createWorkflowRunHandler } from "./create.ts";
import { getWorkflowRunHandler } from "./get.ts";
import { advanceWorkflowRunHandler } from "./advance.ts";
import { gotoWorkflowRunHandler } from "./goto.ts";
import { cancelWorkflowRunHandler } from "./cancel.ts";
import { listWorkflowRunLogsHandler } from "./logs.ts";
import { getWorkflowRunStepsHandler } from "./steps.ts";
import { getWorkflowRunStepTreeHandler } from "./step-tree.ts";
import { listWorkflowRunsHandler } from "./list-by-workflow.ts";
import { streamWorkflowRunEventsHandler } from "./events.ts";

export function createRunsRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/workflows/:id/runs",
    ...createOperationScopedMiddleware(listWorkflowRunsOperationJsonSpec, {
      enforceAuth: false,
    }),
    listWorkflowRunsHandler,
  );

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

  router.post(
    "/runs/:runId/goto",
    ...createOperationScopedMiddleware(gotoWorkflowRunOperationJsonSpec, {
      enforceAuth: false,
    }),
    gotoWorkflowRunHandler,
  );

  router.post(
    "/runs/:runId/cancel",
    ...createOperationScopedMiddleware(cancelWorkflowRunOperationJsonSpec, {
      enforceAuth: false,
    }),
    cancelWorkflowRunHandler,
  );

  router.get(
    "/runs/:runId/logs",
    ...createOperationScopedMiddleware(listWorkflowRunLogsOperationJsonSpec, {
      enforceAuth: false,
    }),
    listWorkflowRunLogsHandler,
  );

  router.get(
    "/runs/:runId/steps",
    ...createOperationScopedMiddleware(getWorkflowRunStepsOperationJsonSpec, {
      enforceAuth: false,
    }),
    getWorkflowRunStepsHandler,
  );

  router.get(
    "/runs/:runId/step-tree",
    ...createOperationScopedMiddleware(getWorkflowRunStepTreeOperationJsonSpec, {
      enforceAuth: false,
    }),
    getWorkflowRunStepTreeHandler,
  );

  // SSE — not modeled as an OpenAPI operation (text/event-stream doesn't
  // fit request/response validation), so no scoped middleware here.
  router.get("/runs/:runId/events", streamWorkflowRunEventsHandler);

  return router;
}
