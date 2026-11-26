import createError from "http-errors";
import type { DbKey } from "@saflib/drizzle";
import { listAuditEventsByTimestamp } from "@saflib/audit-db/queries/audit-event/list-by-timestamp";
import { InvalidAuditEventCursorError } from "@saflib/audit-db/errors";

/** One event as `GET /ops/audit` returns it (`@saflib/ops-spec`'s OpsAuditEvent). */
export interface OpsAuditEventShape {
  id: string;
  ts: string;
  event_type: string;
  outcome: string;
  source: string;
  actor_user_id: string | null;
  on_behalf_of_user_id: string | null;
  auth_method: string | null;
  resource_type: string | null;
  resource_id: string | null;
  request_id: string | null;
  client_ip: string | null;
  untrusted: { details: unknown };
}

/**
 * The audit log for the ops API (`createOpsRouter({ audit })`), newest
 * first. Same shape as `@saflib/ops-http`'s `OpsAuditSource`. Hash-chain
 * and build fields are left out; details are marked untrusted.
 */
export function opsAuditSource(options: { getAuditDbKey: () => DbKey }) {
  return {
    async list(params: { userId?: string; eventPrefix?: string; since?: Date; limit: number; cursor?: string }) {
      const res = await listAuditEventsByTimestamp(options.getAuditDbKey(), {
        order: "desc",
        limit: params.limit,
        cursor: params.cursor,
        from: params.since,
        userId: params.userId,
        eventPrefix: params.eventPrefix,
      });
      if (res.error) {
        if (res.error instanceof InvalidAuditEventCursorError) throw createError(400, "Invalid cursor");
        throw res.error;
      }
      const events: OpsAuditEventShape[] = res.result.events.map((e) => ({
        id: e.id,
        ts: e.ts.toISOString(),
        event_type: e.event_type,
        outcome: e.outcome,
        source: e.source,
        actor_user_id: e.actor_user_id ?? null,
        on_behalf_of_user_id: e.on_behalf_of_user_id ?? null,
        auth_method: e.auth_method ?? null,
        resource_type: e.resource_type ?? null,
        resource_id: e.resource_id ?? null,
        request_id: e.request_id || null,
        client_ip: e.client_ip ?? null,
        untrusted: { details: e.details ?? null },
      }));
      return { events, nextCursor: res.result.nextCursor };
    },
  };
}
