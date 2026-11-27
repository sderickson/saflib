import createError from "http-errors";
import { createHandler } from "@saflib/express";
import { getSafReporters } from "@saflib/node";
import { getLogsDbPath } from "@saflib/node-log-db";
import type { OpsRequestBody, OpsResponseBody } from "@saflib/ops-spec";
import { opsServiceStorage } from "../context.ts";
import { runLogsQuery } from "../logs-query/run-logs-query.ts";

export const queryOpsLogsHandler = createHandler(async function (req, res) {
  const { logsDbKey } = opsServiceStorage.getStore()!;
  if (!logsDbKey) throw createError(404, "This product doesn't persist logs");
  const path = getLogsDbPath(logsDbKey);
  if (!path) throw createError(404, "The logs DB isn't on disk");
  const { sql } = req.body as OpsRequestBody["queryOpsLogs"];
  const result = await runLogsQuery(path, sql);
  // The SQL is kept here (linked to the audit row by request id).
  getSafReporters().log.info("ops logs query", {
    sql: sql.slice(0, 2000),
    rows: result.rows.length,
    truncated: result.truncated,
    duration_ms: result.duration_ms,
  });
  const response: OpsResponseBody["queryOpsLogs"][200] = result;
  res.status(200).json(response);
});
