import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import {
  packageMetricsTable,
  type PackageMetricsEntity,
} from "../../schemas/package-metrics.ts";

export type ListByCommitResult = ReturnsError<PackageMetricsEntity[], never>;

export const listByCommit = queryWrapper(
  async (dbKey: DbKey, commitHash: string): Promise<ListByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(packageMetricsTable)
      .where(eq(packageMetricsTable.commitHash, commitHash));
    return { result };
  },
);
