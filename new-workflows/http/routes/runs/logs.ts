import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { listByRunWorkflowLog } from "@saflib/new-workflows-db";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { mapLogToWire } from "../../map-log.ts";

export const listWorkflowRunLogsHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;
  const since = req.query.since as string | undefined;
  const before = req.query.before as string | undefined;
  const stepRaw = req.query.step_index;
  const step_index =
    typeof stepRaw === "string" && stepRaw.length > 0 ? Number.parseInt(stepRaw, 10) : undefined;
  const contiguous = req.query.contiguous === "true";
  const limitRaw = req.query.limit;
  const limit =
    typeof limitRaw === "string" && limitRaw.length > 0
      ? Number.parseInt(limitRaw, 10)
      : undefined;

  const { result, error } = await listByRunWorkflowLog(ctx.dbKey, {
    run_id: runId,
    after: since ? new Date(since) : undefined,
    before: before ? new Date(before) : undefined,
    afterContiguous: contiguous,
    step_index: Number.isFinite(step_index) ? step_index : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  if (error) throw error satisfies never;

  const response: NewWorkflowsResponseBody["listWorkflowRunLogs"][200] = {
    logs: result.logs.map(mapLogToWire),
    has_more: result.has_more,
    has_more_newer: result.has_more_newer,
  };
  res.status(200).json(response);
});
