import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as createWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/createWorkflowRun";
import { operationJsonSpec as listWorkflowRunsOperationJsonSpec } from "@saflib/new-workflows-spec/operations/listWorkflowRuns";
import { operationJsonSpec as getWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/getWorkflowRun";
import { operationJsonSpec as advanceWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/advanceWorkflowRun";
import { operationJsonSpec as sendFreeformAgentMessageOperationJsonSpec } from "@saflib/new-workflows-spec/operations/sendFreeformAgentMessage";
import { operationJsonSpec as gotoWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/gotoWorkflowRun";
import { operationJsonSpec as cancelWorkflowRunOperationJsonSpec } from "@saflib/new-workflows-spec/operations/cancelWorkflowRun";
import { operationJsonSpec as listWorkflowRunLogsOperationJsonSpec } from "@saflib/new-workflows-spec/operations/listWorkflowRunLogs";
import { operationJsonSpec as listWorkflowRunMessagesOperationJsonSpec } from "@saflib/new-workflows-spec/operations/listWorkflowRunMessages";
import { operationJsonSpec as getWorkflowRunStepsOperationJsonSpec } from "@saflib/new-workflows-spec/operations/getWorkflowRunSteps";
import { operationJsonSpec as getWorkflowRunStepTreeOperationJsonSpec } from "@saflib/new-workflows-spec/operations/getWorkflowRunStepTree";
import { createWorkflowRunHandler } from "./create.ts";
import { getWorkflowRunHandler } from "./get.ts";
import { advanceWorkflowRunHandler } from "./advance.ts";
import { sendFreeformAgentMessageHandler } from "./agent-message.ts";
import { gotoWorkflowRunHandler } from "./goto.ts";
import { cancelWorkflowRunHandler } from "./cancel.ts";
import { listWorkflowRunLogsHandler } from "./logs.ts";
import { getWorkflowRunStepsHandler } from "./steps.ts";
import { listWorkflowRunMessagesHandler } from "./messages.ts";
import { getWorkflowRunStepTreeHandler } from "./step-tree.ts";
import { listWorkflowRunsHandler } from "./list-by-workflow.ts";
import { streamWorkflowRunEventsHandler } from "./events.ts";

export function createRunsRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/workflows/:id/runs",
    ...createOperationScopedMiddleware(listWorkflowRunsOperationJsonSpec),
    listWorkflowRunsHandler,
  );

  router.post(
    "/workflows/:id/runs",
    ...createOperationScopedMiddleware(createWorkflowRunOperationJsonSpec),
    createWorkflowRunHandler,
  );

  router.get(
    "/runs/:runId",
    ...createOperationScopedMiddleware(getWorkflowRunOperationJsonSpec),
    getWorkflowRunHandler,
  );

  router.post(
    "/runs/:runId/advance",
    ...createOperationScopedMiddleware(advanceWorkflowRunOperationJsonSpec),
    advanceWorkflowRunHandler,
  );

  router.post(
    "/runs/:runId/agent-message",
    ...createOperationScopedMiddleware(sendFreeformAgentMessageOperationJsonSpec),
    sendFreeformAgentMessageHandler,
  );

  router.post(
    "/runs/:runId/goto",
    ...createOperationScopedMiddleware(gotoWorkflowRunOperationJsonSpec),
    gotoWorkflowRunHandler,
  );

  router.post(
    "/runs/:runId/cancel",
    ...createOperationScopedMiddleware(cancelWorkflowRunOperationJsonSpec),
    cancelWorkflowRunHandler,
  );

  router.get(
    "/runs/:runId/logs",
    ...createOperationScopedMiddleware(listWorkflowRunLogsOperationJsonSpec),
    listWorkflowRunLogsHandler,
  );

  router.get(
    "/runs/:runId/messages",
    ...createOperationScopedMiddleware(listWorkflowRunMessagesOperationJsonSpec),
    listWorkflowRunMessagesHandler,
  );

  router.get(
    "/runs/:runId/steps",
    ...createOperationScopedMiddleware(getWorkflowRunStepsOperationJsonSpec),
    getWorkflowRunStepsHandler,
  );

  router.get(
    "/runs/:runId/step-tree",
    ...createOperationScopedMiddleware(getWorkflowRunStepTreeOperationJsonSpec),
    getWorkflowRunStepTreeHandler,
  );

  // SSE — not modeled as an OpenAPI operation (text/event-stream doesn't
  // fit request/response validation), so no scoped middleware here.
  router.get("/runs/:runId/events", streamWorkflowRunEventsHandler);

  return router;
}
