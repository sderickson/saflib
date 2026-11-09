import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { logsDbManager } from "../instances.ts";
import type { LogTemplate } from "../schema.ts";

export interface ListTemplatesParams {
  /** Window start: counts cover lines since then. */
  since: Date;
  /** Only templates first seen within the window ("new behavior"). */
  onlyNew?: boolean;
  service?: string;
  /** Default 50, max 200. */
  limit?: number;
}

export type TemplateWithWindowCount = LogTemplate & {
  /** Lines with this template since `since` (bounded by log retention). */
  window_count: number;
  /** One recent line, for context. */
  sample_message: string | null;
};

export type ListTemplatesResult = ReturnsError<TemplateWithWindowCount[], never>;

/** Templates active in the window, busiest first. */
export const listTemplates = queryWrapper(
  async (dbKey: DbKey, params: ListTemplatesParams): Promise<ListTemplatesResult> => {
    const client = logsDbManager.get(dbKey)!.$client;
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const since = params.since.getTime();
    const rows = client
      .prepare(
        `SELECT t.hash, t.template, t.level, t.service_name, t.first_seen, t.last_seen, t.count,
                w.window_count,
                (SELECT message FROM log_entries e WHERE e.template_hash = t.hash ORDER BY e.id DESC LIMIT 1) AS sample_message
         FROM log_templates t
         JOIN (SELECT template_hash, COUNT(*) AS window_count FROM log_entries WHERE ts >= @since GROUP BY template_hash) w
           ON w.template_hash = t.hash
         WHERE (@onlyNew = 0 OR t.first_seen >= @since)
           AND (@service IS NULL OR t.service_name = @service)
         ORDER BY w.window_count DESC
         LIMIT @limit`,
      )
      .all({
        since,
        onlyNew: params.onlyNew ? 1 : 0,
        service: params.service ?? null,
        limit,
      }) as Array<Omit<TemplateWithWindowCount, "first_seen" | "last_seen"> & {
      first_seen: number;
      last_seen: number;
    }>;
    return {
      result: rows.map((r) => ({
        ...r,
        first_seen: new Date(r.first_seen),
        last_seen: new Date(r.last_seen),
      })),
    };
  },
);
