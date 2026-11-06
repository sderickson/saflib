import { queryWrapper } from "@saflib/drizzle";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { jobSettings } from "../../schema.ts";
import type { DbKey } from "@saflib/drizzle";
import { cronDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";

/** True when this caller claimed the tick and should run it. */
export type ClaimTickResult = ReturnsError<boolean, never>;

/**
 * Claims a cron job's schedule tick. One atomic UPDATE, so when several
 * processes fire the same tick (e.g. both colors during a blue-green deploy),
 * exactly one gets `true`.
 */
export const claimTick = queryWrapper(
  async (
    dbKey: DbKey,
    jobName: string,
    tickAt: Date,
  ): Promise<ClaimTickResult> => {
    const db = cronDbManager.get(dbKey)!;
    const claimed = await db
      .update(jobSettings)
      .set({ last_tick_at: tickAt })
      .where(
        and(
          eq(jobSettings.job_name, jobName),
          or(
            isNull(jobSettings.last_tick_at),
            lt(jobSettings.last_tick_at, tickAt),
          ),
        ),
      )
      .returning({ id: jobSettings.id });
    return { result: claimed.length > 0 };
  },
);
