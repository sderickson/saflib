import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { and, desc, eq, gte, lt, lte, sql, type SQL } from "drizzle-orm";
import { logsDbManager } from "../instances.ts";
import { logEntries, logLevels, type LogEntry, type LogLevel } from "../schema.ts";

export interface ListLogsParams {
  since?: Date;
  until?: Date;
  /** Include this level and anything more severe. */
  minLevel?: LogLevel;
  service?: string;
  /** Free-text search over messages (each word matched as a literal). */
  q?: string;
  templateHash?: string;
  requestId?: string;
  /** Default 100, max 500. */
  limit?: number;
  /** From a previous page's `nextCursor`. */
  cursor?: string;
}

export type ListLogsResult = ReturnsError<{ entries: LogEntry[]; nextCursor: string | null }, never>;

/**
 * Quote each word so user text is matched literally and can't use (or break)
 * FTS5 query syntax: `foo "bar` → `"foo" """bar"`.
 */
export function toFtsQuery(q: string): string | undefined {
  const terms = q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 16);
  if (terms.length === 0) return undefined;
  return terms.map((t) => `"${t.replace(/"/g, '""')}"`).join(" ");
}

/** Newest first; keyset pagination on id. */
export const listLogs = queryWrapper(
  async (dbKey: DbKey, params: ListLogsParams): Promise<ListLogsResult> => {
    const db = logsDbManager.get(dbKey)!;
    const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
    const where: SQL[] = [];
    if (params.since) where.push(gte(logEntries.ts, params.since));
    if (params.until) where.push(lte(logEntries.ts, params.until));
    if (params.minLevel) where.push(lte(logEntries.level_num, logLevels.indexOf(params.minLevel)));
    if (params.service) where.push(eq(logEntries.service_name, params.service));
    if (params.templateHash) where.push(eq(logEntries.template_hash, params.templateHash));
    if (params.requestId) where.push(eq(logEntries.request_id, params.requestId));
    if (params.cursor && /^\d+$/.test(params.cursor)) {
      where.push(lt(logEntries.id, Number(params.cursor)));
    }
    const fts = params.q ? toFtsQuery(params.q) : undefined;
    if (fts) {
      where.push(
        sql`${logEntries.id} IN (SELECT rowid FROM log_entries_fts WHERE log_entries_fts MATCH ${fts})`,
      );
    }
    const rows = await db
      .select()
      .from(logEntries)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(logEntries.id))
      .limit(limit + 1);
    const entries = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? String(entries[entries.length - 1]!.id) : null;
    return { result: { entries, nextCursor } };
  },
);
