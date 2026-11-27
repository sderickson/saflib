import type { DbKey } from "@saflib/drizzle";
import { logsDbManager } from "./instances.ts";
import { logsPruned } from "./metrics.ts";

export interface RetentionOptions {
  /** Delete lines older than this. Default 14 days. */
  maxAgeDays?: number;
  /**
   * Delete product events (lines with `event` set) older than this. They're
   * small and are the long view of what users do. Default 180 days.
   */
  eventMaxAgeDays?: number;
  /**
   * Delete `http` (one per request) lines older than this. They're the
   * bulk of the store and matter mostly while debugging recent traffic.
   * Default 7 days.
   */
  httpMaxAgeDays?: number;
  /** Delete oldest lines while live data exceeds this. Default 512 MB. */
  maxBytes?: number;
  /** Forget templates not seen for this long. Default 90 days. */
  templateMaxAgeDays?: number;
}

export interface PruneResult {
  byAge: number;
  bySize: number;
  templates: number;
  usedBytes: number;
}

const BATCH = 5000;
const DAY_MS = 86_400_000;

/**
 * Bytes in use: pages minus free pages. Deleting rows frees pages for reuse
 * without shrinking the file, so this (not the file size) is what the cap
 * measures.
 */
export function usedBytes(dbKey: DbKey): number {
  const client = logsDbManager.get(dbKey)!.$client;
  const pageSize = client.pragma("page_size", { simple: true }) as number;
  const pages = client.pragma("page_count", { simple: true }) as number;
  const free = client.pragma("freelist_count", { simple: true }) as number;
  return (pages - free) * pageSize;
}

/** Apply age and size limits. Synchronous; deletes in batches. */
export function pruneLogs(dbKey: DbKey, options: RetentionOptions = {}): PruneResult {
  const client = logsDbManager.get(dbKey)!.$client;
  const maxAgeMs = (options.maxAgeDays ?? 14) * DAY_MS;
  const maxBytes = options.maxBytes ?? 512 * 1024 * 1024;
  const templateMaxAgeMs = (options.templateMaxAgeDays ?? 90) * DAY_MS;
  const now = Date.now();

  const deleteOlder = client.prepare(
    `DELETE FROM log_entries WHERE id IN (SELECT id FROM log_entries WHERE event IS NULL AND ts < ? LIMIT ${BATCH})`,
  );
  let byAge = 0;
  for (;;) {
    const n = deleteOlder.run(now - maxAgeMs).changes;
    byAge += n;
    if (n < BATCH) break;
  }
  const eventMaxAgeMs = (options.eventMaxAgeDays ?? 180) * DAY_MS;
  const deleteOlderEvents = client.prepare(
    `DELETE FROM log_entries WHERE id IN (SELECT id FROM log_entries WHERE event IS NOT NULL AND ts < ? LIMIT ${BATCH})`,
  );
  for (;;) {
    const n = deleteOlderEvents.run(now - eventMaxAgeMs).changes;
    byAge += n;
    if (n < BATCH) break;
  }
  const httpMaxAgeMs = (options.httpMaxAgeDays ?? 7) * DAY_MS;
  const deleteOlderHttp = client.prepare(
    `DELETE FROM log_entries WHERE id IN (SELECT id FROM log_entries WHERE level = 'http' AND ts < ? LIMIT ${BATCH})`,
  );
  for (;;) {
    const n = deleteOlderHttp.run(now - httpMaxAgeMs).changes;
    byAge += n;
    if (n < BATCH) break;
  }

  // Small steps (about 5% of rows) so the cap isn't overshot by much.
  // Ordinary lines go first; product events only once none are left.
  const deleteOldestLines = client.prepare(
    `DELETE FROM log_entries WHERE id IN (SELECT id FROM log_entries WHERE event IS NULL ORDER BY id LIMIT ?)`,
  );
  const deleteOldestAny = client.prepare(
    `DELETE FROM log_entries WHERE id IN (SELECT id FROM log_entries ORDER BY id LIMIT ?)`,
  );
  let bySize = 0;
  while (usedBytes(dbKey) > maxBytes) {
    const { n: rows } = client.prepare(`SELECT COUNT(*) AS n FROM log_entries`).get() as { n: number };
    const step = Math.min(BATCH, Math.max(100, Math.ceil(rows / 20)));
    let n = deleteOldestLines.run(step).changes;
    if (n === 0) n = deleteOldestAny.run(step).changes;
    bySize += n;
    if (n === 0) break;
  }

  const templates = client
    .prepare(`DELETE FROM log_templates WHERE last_seen < ?`)
    .run(now - templateMaxAgeMs).changes;

  if (byAge) logsPruned.inc({ reason: "age" }, byAge);
  if (bySize) logsPruned.inc({ reason: "size" }, bySize);
  return { byAge, bySize, templates, usedBytes: usedBytes(dbKey) };
}
