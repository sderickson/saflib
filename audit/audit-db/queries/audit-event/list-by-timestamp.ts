import { auditDbManager } from "../../instances.ts";
import {
  auditEventTable,
  type AuditEventEntity,
} from "../../schemas/audit-event.ts";
import { InvalidAuditEventCursorError } from "../../errors.ts";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { and, asc, desc, eq, gt, gte, lt, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export type ListAuditEventsByTimestampParams = {
  from?: Date | number;
  to?: Date | number;
  limit?: number;
  cursor?: string;
  /** Default `asc` (oldest first). Use `desc` for newest first (admin UI). */
  order?: "asc" | "desc";
};

export type ListAuditEventsByTimestampResult = {
  events: AuditEventEntity[];
  nextCursor: string | null;
};

export type ListAuditEventsByTimestampError = InvalidAuditEventCursorError;

function toEpochMs(value: Date | number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value instanceof Date ? value.getTime() : Number(value);
}

/** Base64 over UTF-8 `${tsMs}|${id}` (matches keyset over `(ts, id)`). */
function encodeCursor(tsMs: number, id: string): string {
  return Buffer.from(`${tsMs}|${id}`, "utf8").toString("base64");
}

function parseCursor(cursor: string): { ts: number; id: string } | null {
  const decoded = Buffer.from(cursor, "base64").toString("utf8");
  const sep = decoded.indexOf("|");
  if (sep === -1) {
    return null;
  }
  const ts = Number(decoded.slice(0, sep));
  const id = decoded.slice(sep + 1);
  if (id === "" || !Number.isFinite(ts)) {
    return null;
  }
  return { ts, id };
}

export const listAuditEventsByTimestamp = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListAuditEventsByTimestampParams,
  ): Promise<
    ReturnsError<
      ListAuditEventsByTimestampResult,
      ListAuditEventsByTimestampError
    >
  > => {
    let cursorKey: { ts: number; id: string } | undefined;
    if (params.cursor !== undefined && params.cursor !== "") {
      const parsed = parseCursor(params.cursor);
      if (parsed === null) {
        return { error: new InvalidAuditEventCursorError() };
      }
      cursorKey = parsed;
    }

    const db = auditDbManager.get(dbKey)!;

    const rawLimit = params.limit ?? 100;
    const pageSize = Math.min(Math.max(1, rawLimit), 1000);
    const order = params.order === "desc" ? "desc" : "asc";

    const clauses: SQL[] = [];

    const fromMs = toEpochMs(params.from);
    const toMs = toEpochMs(params.to);
    if (fromMs !== undefined) {
      clauses.push(gte(auditEventTable.ts, new Date(fromMs)));
    }
    if (toMs !== undefined) {
      clauses.push(lte(auditEventTable.ts, new Date(toMs)));
    }
    if (cursorKey !== undefined) {
      const dt = new Date(cursorKey.ts);
      if (order === "asc") {
        clauses.push(
          or(
            gt(auditEventTable.ts, dt),
            and(
              eq(auditEventTable.ts, dt),
              gt(auditEventTable.id, cursorKey.id),
            ),
          )!,
        );
      } else {
        clauses.push(
          or(
            lt(auditEventTable.ts, dt),
            and(
              eq(auditEventTable.ts, dt),
              lt(auditEventTable.id, cursorKey.id),
            ),
          )!,
        );
      }
    }

    const base =
      clauses.length > 0
        ? db.select().from(auditEventTable).where(and(...clauses))
        : db.select().from(auditEventTable);

    const rows =
      order === "asc"
        ? base
            .orderBy(asc(auditEventTable.ts), asc(auditEventTable.id))
            .limit(pageSize + 1)
            .all()
        : base
            .orderBy(desc(auditEventTable.ts), desc(auditEventTable.id))
            .limit(pageSize + 1)
            .all();

    const hasMore = rows.length > pageSize;
    const events = hasMore ? rows.slice(0, pageSize) : rows;

    const last = events[events.length - 1];
    const nextCursor =
      hasMore && last !== undefined
        ? encodeCursor(last.ts.getTime(), last.id)
        : null;

    return { result: { events, nextCursor } };
  },
);
