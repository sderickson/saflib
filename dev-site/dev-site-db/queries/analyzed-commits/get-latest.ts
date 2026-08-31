import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { desc } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import {
  analyzedCommitsTable,
  type AnalyzedCommitEntity,
} from "../../schemas/analyzed-commits.ts";

export type GetLatestResult = ReturnsError<AnalyzedCommitEntity | null, never>;

/**
 * Most recently authored analyzed commit, or null when the table is empty.
 */
export const getLatest = queryWrapper(
  async (dbKey: DbKey): Promise<GetLatestResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const rows = await db
      .select()
      .from(analyzedCommitsTable)
      .orderBy(
        desc(analyzedCommitsTable.authored_at),
        desc(analyzedCommitsTable.hash),
      )
      .limit(1);
    return { result: rows[0] ?? null };
  },
);
