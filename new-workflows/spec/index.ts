import type { components } from "./dist/openapi.d.ts";
import { castJson } from "@saflib/openapi";

export type Error = components["schemas"]["Error"];
export type WorkflowRunMode = components["schemas"]["WorkflowRunMode"];
export type WorkflowRunStatus = components["schemas"]["WorkflowRunStatus"];
export type WorkflowStepStatus = components["schemas"]["WorkflowStepStatus"];
export type WorkflowLogChannel = components["schemas"]["WorkflowLogChannel"];
export type WorkflowLogLevel = components["schemas"]["WorkflowLogLevel"];
export type WorkflowRunAgentConfig =
  components["schemas"]["WorkflowRunAgentConfig"];
export type WorkflowConfigBody = components["schemas"]["WorkflowConfigBody"];

import * as json from "./dist/openapi.json" with { type: "json" };

/**
 * For validating Express requests and responses once new-workflows-http exists.
 */
export const jsonSpec = castJson(json);
