import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/utils";
import { AnalyzedCommitNotFoundError } from "../../errors.ts";
import { devSiteDbManager } from "../../instances.ts";
import {
  analyzedCommitsTable,
  type AnalyzedCommitEntity,
} from "../../schemas/analyzed-commits.ts";

export type GetByHashResult = ReturnsError<
  AnalyzedCommitEntity,
  AnalyzedCommitNotFoundError
>;

export const getByHash = queryWrapper(
  async (dbKey: DbKey, hash: string): Promise<GetByHashResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db.query.analyzedCommitsTable.findFirst({
      where: eq(analyzedCommitsTable.hash, hash),
    });
    if (!result) {
      return { error: new AnalyzedCommitNotFoundError(hash) };
    }
    return { result };
  },
);
