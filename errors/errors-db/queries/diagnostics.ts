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
 * The newest occurrence since `since` whose message, fields or stack contain
 * `text` (a Diagnostics tag), matched literally, or null.
 */
export function findOccurrenceContaining(dbKey: DbKey, text: string, since: Date): FoundOccurrence | null {
  if (text.length < 4 || text.length > 200) return null;
  const client = issuesDbManager.get(dbKey)!.$client;
  const pattern = `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const row = client
    .prepare(
      `SELECT id, group_id, ts FROM issue_occurrences
       WHERE ts >= ? AND (message LIKE ? ESCAPE '\\' OR fields LIKE ? ESCAPE '\\' OR stack LIKE ? ESCAPE '\\')
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
