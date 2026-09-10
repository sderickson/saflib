import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/utils";
import { devSiteDbManager } from "../../instances.ts";
import {
  packageIssueStatsTable,
  type PackageIssueStatsEntity,
} from "../../schemas/package-issue-stats.ts";

export type ListByCommitResult = ReturnsError<PackageIssueStatsEntity[], never>;

export const listByCommit = queryWrapper(
  async (dbKey: DbKey, commit_hash: string): Promise<ListByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(packageIssueStatsTable)
      .where(eq(packageIssueStatsTable.commit_hash, commit_hash));
    return { result };
  },
);
