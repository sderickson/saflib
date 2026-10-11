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
  const step_index = parseIntParam(req.query.step_index);
  const contiguous = parseBoolParam(req.query.contiguous);
  const limit = parseIntParam(req.query.limit);

  const { result, error } = await listByRunWorkflowLog(ctx.dbKey, {
    run_id: runId,
    after: since ? new Date(since) : undefined,
    before: before ? new Date(before) : undefined,
    afterContiguous: contiguous,
    step_index,
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
