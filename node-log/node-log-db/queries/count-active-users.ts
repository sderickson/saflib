import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { logsDbManager } from "../instances.ts";

export type CountActiveUsersResult = ReturnsError<number, never>;

/**
 * Distinct signed-in users with a persisted log line since `since`: a rough
 * "is anyone using it" count (users whose requests logged nothing at info or
 * above aren't counted).
 */
export const countActiveUsers = queryWrapper(
  async (dbKey: DbKey, since: Date): Promise<CountActiveUsersResult> => {
    const row = logsDbManager
      .get(dbKey)!
      .$client.prepare(
        `SELECT COUNT(DISTINCT user_id) AS n FROM log_entries WHERE ts >= ? AND user_id IS NOT NULL AND user_id != ''`,
      )
      .get(since.getTime()) as { n: number };
    return { result: row.n };
  },
);
