export type * from "./types.ts";
export * from "./errors.ts";

import { newWorkflowsDbManager } from "./instances.ts";
export const newWorkflowsDb = newWorkflowsDbManager.publicInterface();

// BEGIN WORKFLOW AREA query-exports FOR drizzle/add-query

export { createWorkflowRun } from "./queries/workflow-run/create.ts";
export { getByIdWorkflowRun } from "./queries/workflow-run/get-by-id.ts";
export { updateStatusAndStepWorkflowRun } from "./queries/workflow-run/update-status-and-step.ts";
export { createWorkflowStep } from "./queries/workflow-step/create.ts";
export { updateResultWorkflowStep } from "./queries/workflow-step/update-result.ts";
export { listByRunWorkflowStep } from "./queries/workflow-step/list-by-run.ts";
export { appendWorkflowLog } from "./queries/workflow-log/append.ts";
export { listByRunWorkflowLog } from "./queries/workflow-log/list-by-run.ts";
// END WORKFLOW AREA
