import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { AnalyzedCommitNotFoundError } from "../../errors.ts";
import { devSiteDbManager } from "../../instances.ts";
import {
  analyzedCommitsTable,
  type AnalyzedCommitEntity,
} from "../../schemas/analyzed-commits.ts";

export interface ListParams {
  /** Commit hash of the last item from the previous page (exclusive). */
  cursor?: string;
  /** Max rows to return. Defaults to 50. */
  limit?: number;
}

export interface ListPage {
  commits: AnalyzedCommitEntity[];
  nextCursor: string | null;
}

export type ListResult = ReturnsError<ListPage, AnalyzedCommitNotFoundError>;

/**
 * Paginated analyzed commits, newest-first by `authoredAt` then `hash`.
 * Cursor is the hash of the last item from the previous page.
 */
export const list = queryWrapper(
  async (dbKey: DbKey, params: ListParams = {}): Promise<ListResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const limit = params.limit ?? 50;

    let whereClause = undefined;
    if (params.cursor) {
      const cursorRow = await db.query.analyzedCommitsTable.findFirst({
        where: eq(analyzedCommitsTable.hash, params.cursor),
      });
      if (!cursorRow) {
        return { error: new AnalyzedCommitNotFoundError(params.cursor) };
      }
      // Strictly after the cursor in (authoredAt DESC, hash DESC) order.
      whereClause = or(
        lt(analyzedCommitsTable.authoredAt, cursorRow.authoredAt),
        and(
          eq(analyzedCommitsTable.authoredAt, cursorRow.authoredAt),
          sql`${analyzedCommitsTable.hash} < ${params.cursor}`,
        ),
      );
    }

    const rows = await db
      .select()
      .from(analyzedCommitsTable)
      .where(whereClause)
      .orderBy(
        desc(analyzedCommitsTable.authoredAt),
        desc(analyzedCommitsTable.hash),
      )
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const commits = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? commits[commits.length - 1].hash : null;
    return { result: { commits, nextCursor } };
  },
);
