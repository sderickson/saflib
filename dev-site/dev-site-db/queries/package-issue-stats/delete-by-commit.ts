import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/utils";
import { devSiteDbManager } from "../../instances.ts";
import { packageIssueStatsTable } from "../../schemas/package-issue-stats.ts";

export type DeleteByCommitResult = ReturnsError<{ deleted: number }, never>;

export const deleteByCommit = queryWrapper(
  async (dbKey: DbKey, commit_hash: string): Promise<DeleteByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const deleted = await db
      .delete(packageIssueStatsTable)
      .where(eq(packageIssueStatsTable.commit_hash, commit_hash))
      .returning();
    return { result: { deleted: deleted.length } };
  },
);
