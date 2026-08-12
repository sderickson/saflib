import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import {
  testCasesTable,
  type TestCaseEntity,
} from "../../schemas/test-cases.ts";

export type ListByCommitResult = ReturnsError<TestCaseEntity[], never>;

export const listByCommit = queryWrapper(
  async (dbKey: DbKey, commitHash: string): Promise<ListByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(testCasesTable)
      .where(eq(testCasesTable.commitHash, commitHash));
    return { result };
  },
);
