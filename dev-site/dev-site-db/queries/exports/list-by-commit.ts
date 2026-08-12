import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import {
  exportsTable,
  type ExportEntity,
} from "../../schemas/exports.ts";

export type ListByCommitResult = ReturnsError<ExportEntity[], never>;

export const listByCommit = queryWrapper(
  async (dbKey: DbKey, commitHash: string): Promise<ListByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(exportsTable)
      .where(eq(exportsTable.commitHash, commitHash));
    return { result };
  },
);
