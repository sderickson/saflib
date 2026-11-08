import createError from "http-errors";
import { createHandler } from "@saflib/express";
import type { OpsResponseBody } from "@saflib/ops-spec";
import { listLogs, type LogLevel } from "@saflib/node-log-db";
import { opsServiceStorage } from "../context.ts";
import { mapLogEntry, queryDate, queryString } from "./_helpers.ts";

export const listOpsLogsHandler = createHandler(async function (req, res) {
  const { logsDbKey } = opsServiceStorage.getStore()!;
  if (!logsDbKey) throw createError(404, "Logs are not enabled for this product");
  const { result, error } = await listLogs(logsDbKey, {
    since: queryDate(req.query.since),
    until: queryDate(req.query.until),
    minLevel: queryString(req.query.level) as LogLevel | undefined,
    service: queryString(req.query.service),
    q: queryString(req.query.q),
    templateHash: queryString(req.query.template),
    requestId: queryString(req.query.request_id),
    limit: req.query.limit === undefined ? undefined : Number(req.query.limit),
    cursor: queryString(req.query.cursor),
  });
  if (error) throw error satisfies never;
  const response: OpsResponseBody["listOpsLogs"][200] = {
    logs: result.entries.map(mapLogEntry),
    next_cursor: result.nextCursor,
  };
  res.status(200).json(response);
});
