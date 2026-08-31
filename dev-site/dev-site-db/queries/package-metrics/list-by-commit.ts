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
  async (dbKey: DbKey, commit_hash: string): Promise<ListByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(packageMetricsTable)
      .where(eq(packageMetricsTable.commit_hash, commit_hash));
    return { result };
  },
);
