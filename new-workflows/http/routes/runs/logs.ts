import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { listByRunWorkflowLog } from "@saflib/new-workflows-db";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { mapLogToWire } from "../../map-log.ts";

export const listWorkflowRunLogsHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;
  const since = req.query.since as string | undefined;

  const { result: logs, error } = await listByRunWorkflowLog(ctx.dbKey, {
    run_id: runId,
    after: since ? new Date(since) : undefined,
  });
  if (error) throw error satisfies never;

  const response: NewWorkflowsResponseBody["listWorkflowRunLogs"][200] = {
    logs: logs.map(mapLogToWire),
  };
  res.status(200).json(response);
});
