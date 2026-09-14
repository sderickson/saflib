import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { newWorkflowsHttpStorage } from "../../context.ts";

export const listWorkflowsHandler = createHandler(async (_req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;

  const response: NewWorkflowsResponseBody["listWorkflows"][200] = {
    workflows: ctx.registry.map((def) => ({
      id: def.id,
      description: def.description,
      source: "code",
      // Wire schema is a generic passthrough (see workflow-summary.yaml).
      inputSchema: def.inputSchema as Record<string, unknown> | undefined,
    })),
  };
  res.status(200).json(response);
});
