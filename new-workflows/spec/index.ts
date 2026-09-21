import type { components, operations } from "./dist/openapi.d.ts";
export type { paths } from "./dist/openapi.d.ts";
import {
  type ExtractResponseBody,
  type ExtractRequestBody,
  castJson,
} from "@saflib/openapi";

export type NewWorkflowsResponseBody = ExtractResponseBody<operations>;
export type NewWorkflowsRequestBody = ExtractRequestBody<operations>;

export type Error = components["schemas"]["Error"];
export type WorkflowRunMode = components["schemas"]["WorkflowRunMode"];
export type WorkflowRunStatus = components["schemas"]["WorkflowRunStatus"];
export type WorkflowStepStatus = components["schemas"]["WorkflowStepStatus"];
export type WorkflowLogChannel = components["schemas"]["WorkflowLogChannel"];
export type WorkflowLogLevel = components["schemas"]["WorkflowLogLevel"];
export type WorkflowRunAgentConfig =
  components["schemas"]["WorkflowRunAgentConfig"];
export type WorkflowConfigBody = components["schemas"]["WorkflowConfigBody"];
export type WorkflowSummary = components["schemas"]["WorkflowSummary"];
export type WorkflowRun = components["schemas"]["WorkflowRun"];
export type WorkflowLogEntry = components["schemas"]["WorkflowLogEntry"];
export type StepResult = components["schemas"]["StepResult"];
export type PlanFile = components["schemas"]["PlanFile"];
export type PlanSummary = components["schemas"]["PlanSummary"];

export {
  parseToolLogPayload,
  type ToolUseLogPayload,
  type ToolResultLogPayload,
  type ToolLogPayload,
} from "./tool-log-payload.ts";

import * as json from "./dist/openapi.json" with { type: "json" };

/**
 * For validating Express requests and responses in new-workflows-http.
 */
export const jsonSpec = castJson(json);
