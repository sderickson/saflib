import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable, type JobStatus } from "../../schemas/job.ts";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";

const DEFAULT_LIMIT = 50;

export type ListJobParams = {
  status?: JobStatus;
  operation_id?: (typeof jobTable.$inferSelect)["operation_id"];
  user_id?: (typeof jobTable.$inferSelect)["user_id"];
  original_request_id?: (typeof jobTable.$inferSelect)["original_request_id"];
  concurrency_key?: string;
  /** Inclusive lower bound on `created_at`. */
  created_after?: Date;
  /** Inclusive upper bound on `created_at`. */
  created_before?: Date;
  /** Page size; defaults to 50. */
  limit?: number;
  /** Rows to skip; defaults to 0. */
  offset?: number;
};

export type ListJobError = never;

/**
 * List jobs with optional filters, newest first (`created_at` desc, then `id`).
 */
export const listJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListJobParams = {},
  ): Promise<
    ReturnsError<(typeof jobTable.$inferSelect)[], ListJobError>
  > => {
    const db = jobsDbManager.get(dbKey)!;

    const conditions: SQL[] = [];
    if (params.status !== undefined) {
      conditions.push(eq(jobTable.status, params.status));
    }
    if (params.operation_id !== undefined) {
      conditions.push(eq(jobTable.operation_id, params.operation_id));
    }
    if (params.user_id !== undefined) {
      conditions.push(eq(jobTable.user_id, params.user_id));
    }
    if (params.original_request_id !== undefined) {
      conditions.push(eq(jobTable.original_request_id, params.original_request_id));
    }
    if (params.concurrency_key !== undefined) {
      conditions.push(eq(jobTable.concurrency_key, params.concurrency_key));
    }
    if (params.created_after !== undefined) {
      conditions.push(gte(jobTable.created_at, params.created_after));
    }
    if (params.created_before !== undefined) {
      conditions.push(lte(jobTable.created_at, params.created_before));
    }

    const limit = params.limit ?? DEFAULT_LIMIT;
    const offset = params.offset ?? 0;

    const rows = await db
      .select()
      .from(jobTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(jobTable.created_at), desc(jobTable.id))
      .limit(limit)
      .offset(offset);

    return { result: rows };
  },
);
