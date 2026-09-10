import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { devSiteDbManager } from "../../instances.ts";
import {
  packageMetricsTable,
  type PackageMetricsEntity,
} from "../../schemas/package-metrics.ts";
import type { InsertPackageMetricsParams } from "../../types.ts";

export type InsertManyResult = ReturnsError<PackageMetricsEntity[], never>;

export const insertMany = queryWrapper(
  async (
    dbKey: DbKey,
    rows: InsertPackageMetricsParams[],
  ): Promise<InsertManyResult> => {
    if (rows.length === 0) {
      return { result: [] };
    }
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db.insert(packageMetricsTable).values(rows).returning();
    return { result };
  },
);
