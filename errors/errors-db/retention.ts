import type { DbKey } from "@saflib/drizzle";
import { issuesDbManager } from "./instances.ts";

const DAY_MS = 86_400_000;

/**
 * Drop hourly counts older than `countsDays` (default 30), and closed issues
 * (resolved/ignored) not seen for `closedDays` (default 90) with their data.
 * Open and regressed issues are kept regardless of age.
 */
export function pruneIssues(dbKey: DbKey, options: { countsDays?: number; closedDays?: number } = {}) {
  const client = issuesDbManager.get(dbKey)!.$client;
  const now = Date.now();
  return client.transaction(() => {
    const counts = client
      .prepare(`DELETE FROM issue_hourly_counts WHERE hour < ?`)
      .run(now - (options.countsDays ?? 30) * DAY_MS).changes;
    const stale = `SELECT id FROM issue_groups WHERE status IN ('resolved','ignored') AND last_seen < ?`;
    const cutoff = now - (options.closedDays ?? 90) * DAY_MS;
    client.prepare(`DELETE FROM issue_occurrences WHERE group_id IN (${stale})`).run(cutoff);
    client.prepare(`DELETE FROM issue_hourly_counts WHERE group_id IN (${stale})`).run(cutoff);
    const groups = client.prepare(`DELETE FROM issue_groups WHERE id IN (${stale})`).run(cutoff).changes;
    return { counts, groups };
  })();
}
