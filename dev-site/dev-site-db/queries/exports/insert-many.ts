import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import {
  exportsTable,
  type ExportEntity,
} from "../../schemas/exports.ts";
import type { InsertExportParams } from "../../types.ts";

export type InsertManyResult = ReturnsError<ExportEntity[], never>;

export const insertMany = queryWrapper(
  async (
    dbKey: DbKey,
    rows: InsertExportParams[],
  ): Promise<InsertManyResult> => {
    if (rows.length === 0) {
      return { result: [] };
    }
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db.insert(exportsTable).values(rows).returning();
    return { result };
  },
);
