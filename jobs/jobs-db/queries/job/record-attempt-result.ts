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
import { and, eq, inArray, ne } from "drizzle-orm";

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

export type RecordAttemptResultJobError = JobNotFoundError | JobNotRunningError;

/**
 * Record a delivery attempt outcome. Only transitions from `running`.
 *
 * - `succeeded` → status succeeded, result + finished_at
 * - `retry` → status retrying, run_at = backoff, result recorded; or, when
 *   another queued row holds the same `dedupe_key`, `dead` (`exhausted`)
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

    const dead = (result: JobResult) => ({
      status: "dead" as const,
      result,
      finished_at: params.now,
      updated_at: params.now,
    });

    // One transaction, so a sibling can't be queued between the check and
    // the update.
    const updated = db.transaction((tx) => {
      let patch;
      if (params.outcome === "succeeded") {
        patch = {
          status: "succeeded" as const,
          result: params.result,
          finished_at: params.now,
          updated_at: params.now,
        };
      } else if (params.outcome === "dead") {
        patch = dead(params.result);
      } else {
        // Another `pending`/`retrying` row with this job's `dedupe_key` (one
        // enqueued while this attempt ran) already covers the work, and
        // re-queueing this one would collide with it on the partial unique
        // index `job_dedupe_key_queued_uidx`. End this one instead, as
        // stalled-job recovery does.
        const job = tx
          .select({ dedupe_key: jobTable.dedupe_key })
          .from(jobTable)
          .where(
            and(eq(jobTable.id, params.id), eq(jobTable.status, "running")),
          )
          .get();
        const queuedSibling =
          job?.dedupe_key != null &&
          tx
            .select({ id: jobTable.id })
            .from(jobTable)
            .where(
              and(
                ne(jobTable.id, params.id),
                eq(jobTable.dedupe_key, job.dedupe_key),
                inArray(jobTable.status, ["pending", "retrying"]),
              ),
            )
            .get() != null;
        patch = queuedSibling
          ? dead({ ...params.result, terminal_reason: "exhausted" })
          : {
              status: "retrying" as const,
              run_at: params.run_at,
              result: params.result,
              updated_at: params.now,
            };
      }
      return tx
        .update(jobTable)
        .set(patch)
        .where(and(eq(jobTable.id, params.id), eq(jobTable.status, "running")))
        .returning()
        .all();
    });

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
