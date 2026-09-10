import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { devSiteDbManager } from "../../instances.ts";
import {
  analyzedCommitsTable,
  type AnalyzedCommitEntity,
} from "../../schemas/analyzed-commits.ts";
import type { InsertAnalyzedCommitParams } from "../../types.ts";

export type InsertResult = ReturnsError<AnalyzedCommitEntity, never>;

export const insert = queryWrapper(
  async (
    dbKey: DbKey,
    params: InsertAnalyzedCommitParams,
  ): Promise<InsertResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db
      .insert(analyzedCommitsTable)
      .values(params)
      .returning();
    return { result: result[0] };
  },
);
