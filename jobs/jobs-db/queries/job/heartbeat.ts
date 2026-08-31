import { jobsDbManager } from "../../instances.ts";
import { JobNotFoundError, JobNotRunningError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, eq } from "drizzle-orm";

export type HeartbeatJobParams = {
  id: (typeof jobTable.$inferSelect)["id"];
  /** Value written to `heartbeat_at` (and `updated_at`). */
  now: Date;
};

export type HeartbeatJobError = JobNotFoundError | JobNotRunningError;

/**
 * Refresh `heartbeat_at` for a running job (stall detection).
 */
export const heartbeatJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: HeartbeatJobParams,
  ): Promise<
    ReturnsError<typeof jobTable.$inferSelect, HeartbeatJobError>
  > => {
    const db = jobsDbManager.get(dbKey)!;

    const updated = await db
      .update(jobTable)
      .set({
        heartbeat_at: params.now,
        updated_at: params.now,
      })
      .where(
        and(eq(jobTable.id, params.id), eq(jobTable.status, "running")),
      )
      .returning();

    if (updated[0]) {
      return { result: updated[0] };
    }

    const existing = await db
      .select({ id: jobTable.id })
      .from(jobTable)
      .where(eq(jobTable.id, params.id))
      .limit(1);

    if (!existing[0]) {
      return { error: new JobNotFoundError() };
    }

    return { error: new JobNotRunningError() };
  },
);
