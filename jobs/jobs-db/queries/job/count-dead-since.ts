import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, count, eq, gte, isNull, notLike, or } from "drizzle-orm";

export type CountDeadSinceJobError = never;

/**
 * Jobs that went `dead` (exhausted retries) since `since`, by `finished_at`.
 * Old dead jobs linger until cleanup, so health checks count recent ones.
 * Diagnostics test jobs (dedupe key `[diag:…]`) fail on purpose and don't
 * count.
 */
export const countDeadSinceJob = queryWrapper(
  async (dbKey: DbKey, since: Date): Promise<ReturnsError<number, CountDeadSinceJobError>> => {
    const db = jobsDbManager.get(dbKey)!;
    const [row] = await db
      .select({ n: count() })
      .from(jobTable)
      .where(
        and(
          eq(jobTable.status, "dead"),
          gte(jobTable.finished_at, since),
          or(isNull(jobTable.dedupe_key), notLike(jobTable.dedupe_key, "[diag:%")),
        ),
      );
    return { result: row?.n ?? 0 };
  },
);
