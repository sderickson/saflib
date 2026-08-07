import { jobsDbManager } from "../../instances.ts";
import { JobNotFoundError, JobNotRunningError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import {
  jobTable,
  type JobResult,
  type JobTerminalReason,
} from "../../schemas/job.ts";
import { and, eq } from "drizzle-orm";

/** Terminal reasons set by delivery classification (not cancel paths). */
export type AttemptDeadTerminalReason = Extract<
  JobTerminalReason,
  | "exhausted"
  | "permanent-status"
  | "rejected-by-endpoint"
  | "auth-unresolvable"
>;

type RecordAttemptResultBase = {
  id: (typeof jobTable.$inferSelect)["id"];
  /** Written to `updatedAt`; also `finishedAt` for terminal outcomes. */
  now: Date;
};

/**
 * Attempt outcome. `errorBody` must already be capped at 8 KB by the caller.
 */
export type RecordAttemptResultJobParams = RecordAttemptResultBase &
  (
    | {
        outcome: "succeeded";
        result: JobResult;
      }
    | {
        outcome: "retry";
        /** Next claim time after backoff. */
        runAt: Date;
        result: JobResult;
      }
    | {
        outcome: "dead";
        result: JobResult & { terminalReason: AttemptDeadTerminalReason };
      }
  );

export type RecordAttemptResultJobError =
  | JobNotFoundError
  | JobNotRunningError;

/**
 * Record a delivery attempt outcome. Only transitions from `running`.
 *
 * - `succeeded` → status succeeded, result + finishedAt
 * - `retry` → status retrying, runAt = backoff, result recorded
 * - `dead` → status dead, result (with terminalReason) + finishedAt
 */
export const recordAttemptResultJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: RecordAttemptResultJobParams,
  ): Promise<
    ReturnsError<typeof jobTable.$inferSelect, RecordAttemptResultJobError>
  > => {
    const db = jobsDbManager.get(dbKey)!;

    const patch =
      params.outcome === "succeeded"
        ? {
            status: "succeeded" as const,
            result: params.result,
            finishedAt: params.now,
            updatedAt: params.now,
          }
        : params.outcome === "retry"
          ? {
              status: "retrying" as const,
              runAt: params.runAt,
              result: params.result,
              updatedAt: params.now,
            }
          : {
              status: "dead" as const,
              result: params.result,
              finishedAt: params.now,
              updatedAt: params.now,
            };

    const updated = await db
      .update(jobTable)
      .set(patch)
      .where(and(eq(jobTable.id, params.id), eq(jobTable.status, "running")))
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
