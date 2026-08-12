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
import { chunkArray, insertBatchSize } from "../../sqlite-batch.ts";

export type InsertManyResult = ReturnsError<TestCaseDefEntity[], never>;

const DEF_BATCH = insertBatchSize(4); // hash, package, path, full_name
const LINK_BATCH = insertBatchSize(2); // commit_hash, test_case_hash

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
    const links = [...linkKeys.values()];

    db.transaction((tx) => {
      for (const batch of chunkArray(defs, DEF_BATCH)) {
        tx.insert(testCaseDefsTable).values(batch).onConflictDoNothing().run();
      }
      for (const batch of chunkArray(links, LINK_BATCH)) {
        tx.insert(commitTestCasesTable)
          .values(batch)
          .onConflictDoNothing()
          .run();
      }
    });

    return { result: defs };
  },
);
