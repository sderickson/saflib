import { jobsDbManager } from "../../instances.ts";
import { JobSpawnCapExceededError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, count, eq, inArray } from "drizzle-orm";

/** Dedupe upsert only collapses queued intent — not jobs already claimed for delivery. */
const queuedDedupeStatuses = ["pending", "retrying"] as const;

export type CreateJobParams = typeof jobTable.$inferInsert & {
  /** Max jobs allowed for `originalRequestId`; reject when count is already ≥ this. */
  spawnCap: number;
};

export type CreateJobData = {
  job: typeof jobTable.$inferSelect;
  /** True when an existing queued row with the same `dedupeKey` was upserted. */
  deduped: boolean;
};

export type CreateJobError = JobSpawnCapExceededError;

export const createJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateJobParams,
  ): Promise<ReturnsError<CreateJobData, CreateJobError>> => {
    const db = jobsDbManager.get(dbKey)!;
    const { spawnCap, ...jobValues } = params;

    return db.transaction((tx) => {
      if (jobValues.dedupeKey != null) {
        const existing = tx
          .select()
          .from(jobTable)
          .where(
            and(
              eq(jobTable.dedupeKey, jobValues.dedupeKey),
              inArray(jobTable.status, queuedDedupeStatuses),
            ),
          )
          .limit(1)
          .all();

        if (existing[0]) {
          const updated = tx
            .update(jobTable)
            .set({
              runAt: jobValues.runAt,
              request: jobValues.request,
              updatedAt: jobValues.updatedAt,
            })
            .where(eq(jobTable.id, existing[0].id))
            .returning()
            .all();

          return {
            result: { job: updated[0]!, deduped: true },
          };
        }
      }

      const countRow = tx
        .select({ value: count() })
        .from(jobTable)
        .where(eq(jobTable.originalRequestId, jobValues.originalRequestId))
        .all()[0]!;

      if (countRow.value >= spawnCap) {
        return { error: new JobSpawnCapExceededError() };
      }

      const inserted = tx.insert(jobTable).values(jobValues).returning().all();

      return {
        result: { job: inserted[0]!, deduped: false },
      };
    });
  },
);
