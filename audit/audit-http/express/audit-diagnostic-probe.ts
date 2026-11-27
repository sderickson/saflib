import type { DbKey } from "@saflib/drizzle";
import { getSafContext } from "@saflib/node";
import { appendAuditEvent } from "@saflib/audit-db/queries/audit-event/append";
import { listAuditEventsByTimestamp } from "@saflib/audit-db/queries/audit-event/list-by-timestamp";
import { throwError } from "@saflib/utils";

type Ref = { kind: "audit"; id: string };

/** Same shape as `@saflib/ops-http`'s `DiagnosticProbe`. */
export interface AuditDiagnosticProbe {
  id: string;
  side: "server";
  label: string;
  what: string;
  destination: string;
  link: "audit";
  run: (ctx: { runId: string; tag: string }) => Promise<void>;
  find: (ctx: { runId: string; since: Date }) => Promise<{ at: Date; ref: Ref } | null>;
}

export const DIAGNOSTICS_AUDIT_EVENT = "diagnostics.test";

/**
 * Diagnostics probe: appends a `diagnostics.test` audit event by the admin
 * running the self-test (operation `diagnostics:<runId>`), and finds it.
 */
export function auditDiagnosticProbe(options: { getAuditDbKey: () => DbKey }): AuditDiagnosticProbe {
  const operation = (runId: string) => `diagnostics:${runId}`;
  return {
    id: "audit-event",
    side: "server",
    label: "Audit event",
    what: "Records a diagnostics.test event",
    destination: "Audit log",
    link: "audit",
    async run({ runId }) {
      const ctx = getSafContext();
      await throwError(
        appendAuditEvent(options.getAuditDbKey(), {
          ts: new Date(),
          source: "system",
          event_type: DIAGNOSTICS_AUDIT_EVENT,
          outcome: "success",
          actor_user_id: ctx.auth?.userId ?? null,
          request_id: ctx.requestId ?? null,
          details: { source: "system", operation: operation(runId) },
        }),
      );
    },
    async find({ runId, since }) {
      const { events } = await throwError(
        listAuditEventsByTimestamp(options.getAuditDbKey(), { from: since, order: "desc", limit: 200 }),
      );
      const hit = events.find(
        (e) =>
          e.event_type === DIAGNOSTICS_AUDIT_EVENT &&
          (e.details as { operation?: string } | null)?.operation === operation(runId),
      );
      return hit ? { at: hit.ts, ref: { kind: "audit", id: hit.id } } : null;
    },
  };
}
