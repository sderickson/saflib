import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { logsDbManager } from "../instances.ts";

export type CountLogsByLevelResult = ReturnsError<Record<string, number>, never>;

/** Lines per level since `since`, e.g. `{ error: 3, warn: 12, info: 900 }`. */
export const countLogsByLevel = queryWrapper(
  async (dbKey: DbKey, since: Date): Promise<CountLogsByLevelResult> => {
    const rows = logsDbManager
      .get(dbKey)!
      .$client.prepare(`SELECT level, COUNT(*) AS n FROM log_entries WHERE ts >= ? GROUP BY level`)
      .all(since.getTime()) as Array<{ level: string; n: number }>;
    return { result: Object.fromEntries(rows.map((r) => [r.level, r.n])) };
  },
);
