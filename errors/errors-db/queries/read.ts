import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { issuesDbManager } from "../instances.ts";
import type { IssueGroup, IssueLevel, IssueOccurrence, IssueStatus } from "../schema.ts";
import { IssueNotFoundError } from "../errors.ts";
import { toGroup } from "./record-occurrence.ts";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export type IssueWithWindow = IssueGroup & {
  /** Occurrences since the window start (hour resolution). */
  window_count: number;
};

export interface ListIssuesParams {
  statuses?: IssueStatus[];
  levels?: IssueLevel[];
  kinds?: string[];
  /** Window for `window_count` and the `seen` filters. Default 24h ago. */
  windowSince?: Date;
  /** Only issues first seen in the window. */
  newInWindow?: boolean;
  /** Only issues seen at all in the window. */
  seenInWindow?: boolean;
  /** Only issues whose status changed to `regressed` in the window. */
  regressedInWindow?: boolean;
  sort?: "last_seen" | "first_seen" | "count" | "window_count";
  /** Default 50, max 200. */
  limit?: number;
  /** Opaque offset from a previous page. */
  cursor?: string;
}

export type ListIssuesResult = ReturnsError<{ issues: IssueWithWindow[]; nextCursor: string | null }, never>;

function inList(column: string, values: readonly string[] | undefined, params: unknown[]): string {
  if (!values || values.length === 0) return "";
  params.push(...values);
  return ` AND ${column} IN (${values.map(() => "?").join(",")})`;
}

export const listIssues = queryWrapper(
  async (dbKey: DbKey, p: ListIssuesParams): Promise<ListIssuesResult> => {
    const client = issuesDbManager.get(dbKey)!.$client;
    const limit = Math.min(Math.max(p.limit ?? 50, 1), 200);
    const offset = p.cursor && /^\d+$/.test(p.cursor) ? Number(p.cursor) : 0;
    const since = (p.windowSince ?? new Date(Date.now() - DAY_MS)).getTime();
    const sinceHour = Math.floor(since / HOUR_MS) * HOUR_MS;
    const params: unknown[] = [sinceHour];
    let where = "1 = 1";
    where += inList("g.status", p.statuses, params);
    where += inList("g.level", p.levels, params);
    where += inList("g.kind", p.kinds, params);
    if (p.newInWindow) {
      where += " AND g.first_seen >= ?";
      params.push(since);
    }
    if (p.seenInWindow) {
      where += " AND g.last_seen >= ?";
      params.push(since);
    }
    if (p.regressedInWindow) {
      where += " AND g.status = 'regressed' AND g.status_changed_at >= ?";
      params.push(since);
    }
    const order = {
      last_seen: "g.last_seen DESC",
      first_seen: "g.first_seen DESC",
      count: "g.count DESC",
      window_count: "window_count DESC, g.last_seen DESC",
    }[p.sort ?? "last_seen"];
    params.push(limit + 1, offset);
    const rows = client
      .prepare(
        `SELECT g.*, COALESCE((SELECT SUM(c.count) FROM issue_hourly_counts c WHERE c.group_id = g.id AND c.hour >= ?), 0) AS window_count
         FROM issue_groups g WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      )
      .all(...params) as Array<Parameters<typeof toGroup>[0] & { window_count: number }>;
    const issues = rows.slice(0, limit).map((r) => ({ ...toGroup(r), window_count: r.window_count }));
    return { result: { issues, nextCursor: rows.length > limit ? String(offset + limit) : null } };
  },
);

export type GetIssueResult = ReturnsError<IssueGroup, IssueNotFoundError>;

export const getIssue = queryWrapper(async (dbKey: DbKey, id: string): Promise<GetIssueResult> => {
  const client = issuesDbManager.get(dbKey)!.$client;
  const row = client.prepare(`SELECT * FROM issue_groups WHERE id = ?`).get(id);
  if (!row) return { error: new IssueNotFoundError(id) };
  return { result: toGroup(row as Parameters<typeof toGroup>[0]) };
});

export type ListOccurrencesResult = ReturnsError<IssueOccurrence[], IssueNotFoundError>;

/** Newest first. */
export const listOccurrences = queryWrapper(
  async (dbKey: DbKey, groupId: string, limit = 20): Promise<ListOccurrencesResult> => {
    const client = issuesDbManager.get(dbKey)!.$client;
    if (!client.prepare(`SELECT 1 FROM issue_groups WHERE id = ?`).get(groupId)) {
      return { error: new IssueNotFoundError(groupId) };
    }
    const rows = client
      .prepare(`SELECT * FROM issue_occurrences WHERE group_id = ? ORDER BY id DESC LIMIT ?`)
      .all(groupId, Math.min(Math.max(limit, 1), 100)) as Array<
      Omit<IssueOccurrence, "ts" | "fields"> & { ts: number; fields: string | null }
    >;
    return {
      result: rows.map((r) => ({
        ...r,
        ts: new Date(r.ts),
        fields: r.fields ? (JSON.parse(r.fields) as Record<string, unknown>) : null,
      })),
    };
  },
);
