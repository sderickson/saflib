import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { listByRunWorkflowLog } from "@saflib/new-workflows-db";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { mapLogToWire } from "../../map-log.ts";

export const listWorkflowRunLogsHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;
  const after_seq = parseIntParam(req.query.after_seq);
  const before_seq = parseIntParam(req.query.before_seq);
  const step_index = parseIntParam(req.query.step_index);
  const anchor_seq = parseIntParam(req.query.anchor_seq);
  const contiguous = parseBoolParam(req.query.contiguous);
  const limit = parseIntParam(req.query.limit);

  const { result, error } = await listByRunWorkflowLog(ctx.dbKey, {
    run_id: runId,
    after_seq,
    before_seq,
    afterContiguous: contiguous,
    step_index,
    anchor_seq,
    limit,
  });
  if (error) throw error satisfies never;

  const response: NewWorkflowsResponseBody["listWorkflowRunLogs"][200] = {
    logs: result.logs.map(mapLogToWire),
    has_more: result.has_more,
    has_more_newer: result.has_more_newer,
  };
  res.status(200).json(response);
});

// The OpenAPI validator coerces query params to their schema types, so these
// arrive as numbers/booleans in the server but as strings when unvalidated.
function parseIntParam(raw: unknown): number | undefined {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function parseBoolParam(raw: unknown): boolean {
  return raw === true || raw === "true";
}
