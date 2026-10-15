import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { listDirectMessagesWorkflowLog } from "@saflib/new-workflows-db";
import { FREEFORM_MESSAGE_MARKER } from "@saflib/new-workflows";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { mapLogToWire } from "../../map-log.ts";

export const listWorkflowRunMessagesHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;

  const { result, error } = await listDirectMessagesWorkflowLog(ctx.dbKey, {
    run_id: runId,
    marker: FREEFORM_MESSAGE_MARKER,
  });
  if (error) throw error satisfies never;

  const response: NewWorkflowsResponseBody["listWorkflowRunMessages"][200] = {
    messages: result.map(mapLogToWire),
  };
  res.status(200).json(response);
});
