import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable, type JobStatus } from "../../schemas/job.ts";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";

const DEFAULT_LIMIT = 50;

export type ListJobParams = {
  status?: JobStatus;
  operationId?: (typeof jobTable.$inferSelect)["operationId"];
  userId?: (typeof jobTable.$inferSelect)["userId"];
  originalRequestId?: (typeof jobTable.$inferSelect)["originalRequestId"];
  /** Inclusive lower bound on `createdAt`. */
  createdAfter?: Date;
  /** Inclusive upper bound on `createdAt`. */
  createdBefore?: Date;
  /** Page size; defaults to 50. */
  limit?: number;
  /** Rows to skip; defaults to 0. */
  offset?: number;
};

export type ListJobError = never;

/**
 * List jobs with optional filters, newest first (`createdAt` desc, then `id`).
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
    if (params.operationId !== undefined) {
      conditions.push(eq(jobTable.operationId, params.operationId));
    }
    if (params.userId !== undefined) {
      conditions.push(eq(jobTable.userId, params.userId));
    }
    if (params.originalRequestId !== undefined) {
      conditions.push(eq(jobTable.originalRequestId, params.originalRequestId));
    }
    if (params.createdAfter !== undefined) {
      conditions.push(gte(jobTable.createdAt, params.createdAfter));
    }
    if (params.createdBefore !== undefined) {
      conditions.push(lte(jobTable.createdAt, params.createdBefore));
    }

    const limit = params.limit ?? DEFAULT_LIMIT;
    const offset = params.offset ?? 0;

    const rows = await db
      .select()
      .from(jobTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(jobTable.createdAt), desc(jobTable.id))
      .limit(limit)
      .offset(offset);

    return { result: rows };
  },
);
