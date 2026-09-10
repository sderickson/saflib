import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { devSiteDbManager } from "../../instances.ts";
import {
  packageIssueStatsTable,
  type PackageIssueStatsEntity,
} from "../../schemas/package-issue-stats.ts";
import type { InsertPackageIssueStatsParams } from "../../types.ts";

export type InsertManyResult = ReturnsError<PackageIssueStatsEntity[], never>;

export const insertMany = queryWrapper(
  async (
    dbKey: DbKey,
    rows: InsertPackageIssueStatsParams[],
  ): Promise<InsertManyResult> => {
    if (rows.length === 0) {
      return { result: [] };
    }
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db
      .insert(packageIssueStatsTable)
      .values(rows)
      .returning();
    return { result };
  },
);
