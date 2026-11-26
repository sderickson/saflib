import type { DbKey } from "@saflib/drizzle";
import { issuesDbManager } from "../instances.ts";
import { isDiagnosticIssueTitle } from "../fingerprint.ts";
import { setIssueStatus } from "./set-status.ts";

export interface FoundOccurrence {
  groupId: string;
  occurrenceId: number;
  ts: Date;
}

/**
 * The newest occurrence since `since` whose message or fields contain
 * `text` (a Diagnostics run id), or null. Ids are alphanumeric; anything
 * else is rejected so the LIKE pattern stays literal.
 */
export function findOccurrenceContaining(dbKey: DbKey, text: string, since: Date): FoundOccurrence | null {
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(text)) return null;
  const client = issuesDbManager.get(dbKey)!.$client;
  const pattern = `%${text}%`;
  const row = client
    .prepare(
      `SELECT id, group_id, ts FROM issue_occurrences
       WHERE ts >= ? AND (message LIKE ? OR fields LIKE ? OR stack LIKE ?)
       ORDER BY id DESC LIMIT 1`,
    )
    .get(since.getTime(), pattern, pattern, pattern) as { id: number; group_id: string; ts: number } | undefined;
  return row ? { groupId: row.group_id, occurrenceId: row.id, ts: new Date(row.ts) } : null;
}

/** Resolve every open or regressed Diagnostics test issue. Returns how many. */
export async function resolveDiagnosticIssues(dbKey: DbKey, actor: string): Promise<number> {
  const client = issuesDbManager.get(dbKey)!.$client;
  const rows = client
    .prepare(`SELECT id, title FROM issue_groups WHERE status IN ('open', 'regressed')`)
    .all() as { id: string; title: string }[];
  let n = 0;
  for (const r of rows) {
    if (!isDiagnosticIssueTitle(r.title)) continue;
    const { error } = await setIssueStatus(dbKey, r.id, {
      status: "resolved",
      actor,
      note: "Diagnostics test signal",
    });
    if (!error) n++;
  }
  return n;
}
