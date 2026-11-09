import { randomUUID } from "node:crypto";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { and, desc, eq, gte, inArray, isNull, lt, notInArray, or } from "drizzle-orm";
import { opsDbManager } from "../../instances.ts";
import { opsAlerts, type OpsAlert } from "../../schema.ts";
import { OpsAlertNotFoundError } from "../../errors.ts";

/** One alert as Alertmanager's webhook (version 4) sends it. */
export interface IncomingAlert {
  fingerprint: string;
  status: "firing" | "resolved";
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  /** Zero time (`0001-01-01…`) while firing. */
  endsAt?: string;
}

function parseTime(value: string | undefined): Date | null {
  if (!value || value.startsWith("0001-")) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Record alerts from one webhook delivery. A fingerprint seen before updates
 * its row; if it starts firing again (new `startsAt`), the ack is cleared.
 */
export const upsertAlerts = queryWrapper(
  async (dbKey: DbKey, alerts: IncomingAlert[], now: Date = new Date()): Promise<ReturnsError<number, never>> => {
    const db = opsDbManager.get(dbKey)!;
    for (const a of alerts) {
      const startsAt = parseTime(a.startsAt) ?? now;
      const values = {
        alertname: a.labels.alertname ?? "unknown",
        severity: a.labels.severity ?? null,
        status: a.status,
        labels: JSON.stringify(a.labels),
        annotations: JSON.stringify(a.annotations ?? {}),
        starts_at: startsAt,
        ends_at: a.status === "resolved" ? (parseTime(a.endsAt) ?? now) : null,
        last_received_at: now,
      };
      const existing = await db.query.opsAlerts.findFirst({ where: eq(opsAlerts.fingerprint, a.fingerprint) });
      if (!existing) {
        await db.insert(opsAlerts).values({
          ...values,
          id: randomUUID(),
          fingerprint: a.fingerprint,
          first_received_at: now,
        });
        continue;
      }
      const refired = a.status === "firing" && existing.starts_at.getTime() !== startsAt.getTime();
      await db
        .update(opsAlerts)
        .set({ ...values, ...(refired ? { acked_at: null, acked_by: null } : {}) })
        .where(eq(opsAlerts.id, existing.id));
    }
    return { result: alerts.length };
  },
);

export interface ListAlertsParams {
  statuses?: OpsAlert["status"][];
  /** Alerts firing at any point since then (still firing, or resolved after it). */
  activeSince?: Date;
  /** Only unacknowledged alerts. */
  unacked?: boolean;
  /** Leave these out (e.g. the Watchdog heartbeat). */
  excludeAlertnames?: string[];
  /** Only these. */
  alertnames?: string[];
  limit?: number;
}

export const listAlerts = queryWrapper(
  async (dbKey: DbKey, params: ListAlertsParams = {}): Promise<ReturnsError<OpsAlert[], never>> => {
    const db = opsDbManager.get(dbKey)!;
    const where = [];
    if (params.statuses?.length) where.push(inArray(opsAlerts.status, params.statuses));
    if (params.activeSince) {
      where.push(or(eq(opsAlerts.status, "firing"), gte(opsAlerts.ends_at, params.activeSince)));
    }
    if (params.unacked) where.push(isNull(opsAlerts.acked_at));
    if (params.excludeAlertnames?.length) where.push(notInArray(opsAlerts.alertname, params.excludeAlertnames));
    if (params.alertnames?.length) where.push(inArray(opsAlerts.alertname, params.alertnames));
    const rows = await db
      .select()
      .from(opsAlerts)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(opsAlerts.starts_at))
      .limit(Math.min(params.limit ?? 50, 200));
    return { result: rows };
  },
);

export type AckAlertResult = ReturnsError<OpsAlert, OpsAlertNotFoundError>;

export const ackAlert = queryWrapper(
  async (dbKey: DbKey, id: string, ackedBy: string, now: Date = new Date()): Promise<AckAlertResult> => {
    const db = opsDbManager.get(dbKey)!;
    const [row] = await db
      .update(opsAlerts)
      .set({ acked_at: now, acked_by: ackedBy })
      .where(eq(opsAlerts.id, id))
      .returning();
    return row ? { result: row } : { error: new OpsAlertNotFoundError(id) };
  },
);

/** Delete resolved alerts that ended before `before`. */
export const pruneResolvedAlerts = queryWrapper(
  async (dbKey: DbKey, before: Date): Promise<ReturnsError<number, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const rows = await db
      .delete(opsAlerts)
      .where(and(eq(opsAlerts.status, "resolved"), lt(opsAlerts.ends_at, before)))
      .returning({ id: opsAlerts.id });
    return { result: rows.length };
  },
);
