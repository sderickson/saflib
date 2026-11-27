import createError from "http-errors";
import { createHandler } from "@saflib/express";
import type { OpsResponseBody } from "@saflib/ops-spec";
import { opsServiceStorage } from "../context.ts";

const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined);

export const listOpsAuditEventsHandler = createHandler(async function (req, res) {
  const { audit } = opsServiceStorage.getStore()!;
  if (!audit) throw createError(404, "This product has no audit log");
  const sinceRaw = str(req.query.since);
  const since = sinceRaw ? new Date(sinceRaw) : undefined;
  if (since && Number.isNaN(since.getTime())) throw createError(400, "Invalid since");
  const { events, nextCursor } = await audit.list({
    userId: str(req.query.user_id),
    eventPrefix: str(req.query.event_prefix),
    since,
    limit: Math.min(Math.max(Number(req.query.limit ?? 50) || 50, 1), 200),
    cursor: str(req.query.cursor),
  });
  const response: OpsResponseBody["listOpsAuditEvents"][200] = { events, next_cursor: nextCursor };
  res.status(200).json(response);
});
