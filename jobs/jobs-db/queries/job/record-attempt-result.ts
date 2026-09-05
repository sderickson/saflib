import { jobsDbManager } from "../../instances.ts";
import { JobNotFoundError, JobNotRunningError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/utils";
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
  /** Written to `updated_at`; also `finished_at` for terminal outcomes. */
  now: Date;
};

/**
 * Attempt outcome. `error_body` must already be capped at 8 KB by the caller.
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
        run_at: Date;
        result: JobResult;
      }
    | {
        outcome: "dead";
        result: JobResult & { terminal_reason: AttemptDeadTerminalReason };
      }
  );

export type RecordAttemptResultJobError =
  | JobNotFoundError
  | JobNotRunningError;

/**
 * Record a delivery attempt outcome. Only transitions from `running`.
 *
 * - `succeeded` → status succeeded, result + finished_at
 * - `retry` → status retrying, run_at = backoff, result recorded
 * - `dead` → status dead, result (with terminal_reason) + finished_at
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
            finished_at: params.now,
            updated_at: params.now,
          }
        : params.outcome === "retry"
          ? {
              status: "retrying" as const,
              run_at: params.run_at,
              result: params.result,
              updated_at: params.now,
            }
          : {
              status: "dead" as const,
              result: params.result,
              finished_at: params.now,
              updated_at: params.now,
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
