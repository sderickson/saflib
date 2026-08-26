import { createHandler } from "./handler.ts";
import createError from "http-errors";
import type { DevLogResponseBody } from "@saflib/node-log-spec";
import { getDevLogs } from "../lib/devLogBuffer.ts";
import { assertDevLogsAvailable, parseAfterId } from "./dev-logs-shared.ts";

export function createListDevLogsHandler() {
  return createHandler(async (req, res) => {
    assertDevLogsAvailable();
    const afterId = parseAfterId(
      typeof req.query.after === "string" ? req.query.after : undefined,
    );
    const limitRaw =
      typeof req.query.limit === "string" ? req.query.limit : undefined;
    let limit: number | undefined;
    if (limitRaw !== undefined) {
      limit = Number(limitRaw);
      if (!Number.isFinite(limit) || limit < 0) {
        throw createError(400, "Invalid limit");
      }
    }
    const logs = getDevLogs({ afterId, limit });
    res
      .status(200)
      .json({ logs } satisfies DevLogResponseBody["listDevLogs"][200]);
  });
}
