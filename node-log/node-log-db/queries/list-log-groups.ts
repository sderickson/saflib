import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { logsDbManager } from "../instances.ts";
import { logLevels, type LogLevel } from "../schema.ts";
import { toFtsQuery } from "./list-logs.ts";

export interface ListLogGroupsParams {
  since?: Date;
  until?: Date;
  /** Groups with a line at this level or more severe. */
  minLevel?: LogLevel;
  /** Groups with a line matching this text. */
  q?: string;
  userId?: string;
  contextId?: string;
  /** Default 50, max 200. */
  limit?: number;
  /** From a previous page's `nextCursor`. */
  cursor?: string;
}

/** The `http` line a request group ends with: method, route and outcome. */
export interface LogGroupRequestLine {
  method: string | null;
  route: string | null;
  status: number | null;
  duration_ms: number | null;
  internal: boolean;
}

export interface LogGroup {
  /** `request` | `job` | `cron` | `process`, or null for a lone line. */
  kind: string | null;
  /** The context id; for a lone line, null (see `line_id`). */
  context_id: string | null;
  /** For a lone line, its id. */
  line_id: number | null;
  first_ts: Date;
  last_ts: Date;
  /** Newest line id in the group; groups are ordered by it. */
  last_id: number;
  /** Lines below `http` level (the application's own lines). */
  count: number;
  errors: number;
  warnings: number;
  user_id: string | null;
  operation_name: string | null;
  service_name: string | null;
  /** First line's message: the title of a lone line or a process start. */
  first_message: string;
  request: LogGroupRequestLine | null;
}

export type ListLogGroupsResult = ReturnsError<
  { groups: LogGroup[]; nextCursor: string | null },
  never
>;

const ERROR = logLevels.indexOf("error");
const WARN = logLevels.indexOf("warn");
const HTTP = logLevels.indexOf("http");

interface AggRow {
  key: string;
  kind: string | null;
  context_id: string | null;
  line_id: number | null;
  first_ts: number;
  last_ts: number;
  last_id: number;
  count: number;
  errors: number;
  warnings: number;
  user_id: string | null;
  operation_name: string | null;
  service_name: string | null;
  first_message: string;
  http_fields: string | null;
  http_message: string | null;
}

function parseRequestLine(fields: string | null, message: string | null): LogGroupRequestLine | null {
  if (!fields && !message) return null;
  let f: Record<string, unknown> = {};
  try {
    f = fields ? (JSON.parse(fields) as Record<string, unknown>) : {};
  } catch {
    // Fall back to what the message says.
  }
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    method: str(f.method),
    route: str(f.route),
    status: num(f.status),
    duration_ms: num(f.duration_ms),
    internal: f.internal === true,
  };
}

/**
 * Log lines grouped by what they belong to (a request, job delivery, cron
 * tick or process start), newest group first. Filters pick which groups to
 * show; counts and the title are over all of a group's lines. Lines with no
 * context come back as single-line groups. Keyset pagination on the newest
 * line id.
 */
export const listLogGroups = queryWrapper(
  async (dbKey: DbKey, params: ListLogGroupsParams): Promise<ListLogGroupsResult> => {
    const client = logsDbManager.get(dbKey)!.$client;
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);

    const where: string[] = [];
    const args: (string | number)[] = [];
    if (params.since) {
      where.push("ts >= ?");
      args.push(params.since.getTime());
    }
    if (params.until) {
      where.push("ts <= ?");
      args.push(params.until.getTime());
    }
    if (params.minLevel) {
      where.push("level_num <= ?");
      args.push(logLevels.indexOf(params.minLevel));
    }
    if (params.userId) {
      where.push("user_id = ?");
      args.push(params.userId);
    }
    if (params.contextId) {
      where.push("context_id = ?");
      args.push(params.contextId);
    }
    const fts = params.q ? toFtsQuery(params.q) : undefined;
    if (fts) {
      where.push("id IN (SELECT rowid FROM log_entries_fts WHERE log_entries_fts MATCH ?)");
      args.push(fts);
    }
    const key = "COALESCE(context_id, 'line:' || id)";
    const having = params.cursor && /^\d+$/.test(params.cursor) ? "HAVING MAX(id) < ?" : "";
    if (having) args.push(Number(params.cursor));

    // 1. Which groups: newest first among those with a matching line.
    const keys = client
      .prepare(
        `SELECT ${key} AS key, MAX(id) AS mid FROM log_entries
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
         GROUP BY key ${having}
         ORDER BY MAX(id) DESC LIMIT ?`,
      )
      .all(...args, limit + 1) as { key: string; mid: number }[];
    const pageKeys = keys.slice(0, limit);
    const page = pageKeys.map((k) => k.key);
    if (page.length === 0) return { result: { groups: [], nextCursor: null } };

    // 2. What's in them: over all of each group's lines, not just matches.
    const placeholders = page.map(() => "?").join(",");
    const rows = client
      .prepare(
        `WITH g AS (
           SELECT ${key} AS key, * FROM log_entries WHERE ${key} IN (${placeholders})
         )
         SELECT key,
           MAX(context_kind) AS kind,
           MAX(context_id) AS context_id,
           CASE WHEN MAX(context_id) IS NULL THEN MIN(id) END AS line_id,
           MIN(ts) AS first_ts, MAX(ts) AS last_ts, MAX(id) AS last_id,
           SUM(level_num < ${HTTP}) AS count,
           SUM(level_num = ${ERROR}) AS errors,
           SUM(level_num = ${WARN}) AS warnings,
           MAX(user_id) AS user_id,
           (SELECT operation_name FROM g g2 WHERE g2.key = g.key AND operation_name IS NOT NULL ORDER BY id DESC LIMIT 1) AS operation_name,
           (SELECT service_name FROM g g2 WHERE g2.key = g.key ORDER BY id LIMIT 1) AS service_name,
           (SELECT message FROM g g2 WHERE g2.key = g.key ORDER BY id LIMIT 1) AS first_message,
           (SELECT fields FROM g g2 WHERE g2.key = g.key AND level_num = ${HTTP} ORDER BY id DESC LIMIT 1) AS http_fields,
           (SELECT message FROM g g2 WHERE g2.key = g.key AND level_num = ${HTTP} ORDER BY id DESC LIMIT 1) AS http_message
         FROM g GROUP BY key`,
      )
      .all(...page) as AggRow[];

    const byKey = new Map(rows.map((r) => [r.key, r]));
    const groups: LogGroup[] = page.flatMap((k) => {
      const r = byKey.get(k);
      if (!r) return [];
      return [
        {
          kind: r.kind,
          context_id: r.context_id,
          line_id: r.line_id,
          first_ts: new Date(r.first_ts),
          last_ts: new Date(r.last_ts),
          last_id: r.last_id,
          count: r.count,
          errors: r.errors,
          warnings: r.warnings,
          user_id: r.user_id,
          operation_name: r.operation_name,
          service_name: r.service_name,
          first_message: r.first_message,
          request: parseRequestLine(r.http_fields, r.http_message),
        },
      ];
    });
    // The cursor follows step 1's ordering (newest matching line).
    const lastKey = pageKeys[pageKeys.length - 1];
    const nextCursor = keys.length > limit && lastKey ? String(lastKey.mid) : null;
    return { result: { groups, nextCursor } };
  },
);
