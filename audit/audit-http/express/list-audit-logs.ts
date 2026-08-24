import createError from "http-errors";
import { createHandler } from "./handler.ts";
import type { AuditResponseBody } from "@saflib/audit-spec/types";
import type { AuditEventEntity } from "@saflib/audit-db/schemas/audit-event";
import { getAuditEventTimestampBounds } from "@saflib/audit-db/queries/audit-event/timestamp-bounds";
import { listAuditEventsByTimestamp } from "@saflib/audit-db/queries/audit-event/list-by-timestamp";
import { InvalidAuditEventCursorError } from "@saflib/audit-db/errors";
import { throwError } from "@saflib/monorepo";
import type { DbKey } from "@saflib/drizzle";

function mapEntityToAuditLog(
  e: AuditEventEntity,
): AuditResponseBody["listAuditLogs"][200]["auditLogs"][number] {
  return {
    id: e.id,
    ts: e.ts.toISOString(),
    prevHash: e.prev_hash,
    rowHash: e.row_hash,
    schemaVersion: e.schema_version,
    source: e.source,
    actorUserId: e.actor_user_id,
    onBehalfOfUserId: e.on_behalf_of_user_id,
    authMethod: e.auth_method,
    requestId: e.request_id,
    clientIp: e.client_ip,
    eventType: e.event_type,
    resourceType: e.resource_type,
    resourceId: e.resource_id,
    outcome: e.outcome,
    gitCommitRoot: e.git_commit_root,
    gitCommitSaflib: e.git_commit_saflib,
    env: e.env,
    details: e.details,
  };
}

function parseQueryString(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) {
    return v;
  }
  return undefined;
}

function parseQueryLimit(v: unknown): number | undefined {
  if (typeof v === "string" && /^\d+$/.test(v)) {
    return Number(v);
  }
  if (typeof v === "number" && Number.isInteger(v)) {
    return v;
  }
  return undefined;
}

export type CreateListAuditLogsHandlerOptions = {
  getAuditDbKey: () => DbKey;
};

export function createListAuditLogsHandler(
  options: CreateListAuditLogsHandlerOptions,
) {
  return createHandler(async (req, res) => {
    const auditDbKey = options.getAuditDbKey();

    const fromRaw = parseQueryString(req.query.from);
    const cursor = parseQueryString(req.query.cursor);
    const limit = parseQueryLimit(req.query.limit);
    const orderRaw = parseQueryString(req.query.order);

    let from: Date | undefined;
    if (fromRaw !== undefined) {
      const d = new Date(fromRaw);
      if (Number.isNaN(d.getTime())) {
        throw createError(400, "Invalid from date-time");
      }
      from = d;
    }

    let order: "asc" | "desc" | undefined;
    if (orderRaw !== undefined) {
      if (orderRaw !== "asc" && orderRaw !== "desc") {
        throw createError(400, "Invalid order");
      }
      order = orderRaw;
    }

    const [bounds, listRes] = await Promise.all([
      throwError(getAuditEventTimestampBounds(auditDbKey)),
      listAuditEventsByTimestamp(auditDbKey, {
        from,
        cursor,
        limit,
        ...(order !== undefined ? { order } : {}),
      }),
    ]);

    if (listRes.error) {
      if (listRes.error instanceof InvalidAuditEventCursorError) {
        throw createError(400, "Invalid cursor");
      }
      throw listRes.error;
    }

    const { headAt, tailAt } = bounds;
    const { events, nextCursor } = listRes.result;

    const response: AuditResponseBody["listAuditLogs"][200] = {
      auditLogs: events.map(mapEntityToAuditLog),
      headAt: headAt ? headAt.toISOString() : null,
      tailAt: tailAt ? tailAt.toISOString() : null,
      nextCursor,
    };

    res.status(200).json(response);
  });
}
