import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import {
  testCaseDefsTable,
  type TestCaseDefEntity,
} from "../../schemas/test-cases.ts";
import { commitTestCasesTable } from "../../schemas/commit-test-cases.ts";
import type { InsertTestCaseParams } from "../../types.ts";
import { hashTestCaseIdentity } from "../../hashes.ts";

export type InsertManyResult = ReturnsError<TestCaseDefEntity[], never>;

export const insertMany = queryWrapper(
  async (
    dbKey: DbKey,
    rows: InsertTestCaseParams[],
  ): Promise<InsertManyResult> => {
    if (rows.length === 0) {
      return { result: [] };
    }
    const db = devSiteDbManager.get(dbKey)!;

    const defsByHash = new Map<string, TestCaseDefEntity>();
    const linkKeys = new Map<
      string,
      { commitHash: string; testCaseHash: string }
    >();
    for (const row of rows) {
      const hash = hashTestCaseIdentity(row);
      if (!defsByHash.has(hash)) {
        defsByHash.set(hash, {
          hash,
          packageName: row.packageName,
          filePath: row.filePath,
          fullName: row.fullName,
        });
      }
      linkKeys.set(`${row.commitHash}:${hash}`, {
        commitHash: row.commitHash,
        testCaseHash: hash,
      });
    }
    const defs = [...defsByHash.values()];

    await db.insert(testCaseDefsTable).values(defs).onConflictDoNothing();
    await db
      .insert(commitTestCasesTable)
      .values([...linkKeys.values()])
      .onConflictDoNothing();

    return { result: defs };
  },
);
