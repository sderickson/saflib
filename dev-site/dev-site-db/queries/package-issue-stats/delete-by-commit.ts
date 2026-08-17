import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import { packageIssueStatsTable } from "../../schemas/package-issue-stats.ts";

export type DeleteByCommitResult = ReturnsError<{ deleted: number }, never>;

export const deleteByCommit = queryWrapper(
  async (dbKey: DbKey, commitHash: string): Promise<DeleteByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const deleted = await db
      .delete(packageIssueStatsTable)
      .where(eq(packageIssueStatsTable.commitHash, commitHash))
      .returning();
    return { result: { deleted: deleted.length } };
  },
);
