import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq, inArray, sql, asc } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import {
  testCaseDefsTable,
  type TestCaseDefEntity,
} from "../../schemas/test-cases.ts";
import { commitTestCasesTable } from "../../schemas/commit-test-cases.ts";

export type ListByCommitResult = ReturnsError<TestCaseDefEntity[], never>;

export const listByCommit = queryWrapper(
  async (dbKey: DbKey, commitHash: string): Promise<ListByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db
      .select({
        hash: testCaseDefsTable.hash,
        packageName: testCaseDefsTable.packageName,
        filePath: testCaseDefsTable.filePath,
        fullName: testCaseDefsTable.fullName,
      })
      .from(commitTestCasesTable)
      .innerJoin(
        testCaseDefsTable,
        eq(commitTestCasesTable.testCaseHash, testCaseDefsTable.hash),
      )
      .where(eq(commitTestCasesTable.commitHash, commitHash))
      .orderBy(
        asc(testCaseDefsTable.packageName),
        asc(testCaseDefsTable.filePath),
        asc(testCaseDefsTable.fullName),
      );
    return { result };
  },
);

export type ListHashesByCommitResult = ReturnsError<string[], never>;

export const listHashesByCommit = queryWrapper(
  async (
    dbKey: DbKey,
    commitHash: string,
  ): Promise<ListHashesByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const rows = await db
      .select({ hash: commitTestCasesTable.testCaseHash })
      .from(commitTestCasesTable)
      .where(eq(commitTestCasesTable.commitHash, commitHash));
    return { result: rows.map((r) => r.hash) };
  },
);

export type CountByCommitResult = ReturnsError<number, never>;

export const countByCommit = queryWrapper(
  async (dbKey: DbKey, commitHash: string): Promise<CountByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const rows = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(commitTestCasesTable)
      .where(eq(commitTestCasesTable.commitHash, commitHash));
    return { result: rows[0]?.n ?? 0 };
  },
);

export type GetByHashesResult = ReturnsError<TestCaseDefEntity[], never>;

export const getByHashes = queryWrapper(
  async (dbKey: DbKey, hashes: string[]): Promise<GetByHashesResult> => {
    if (hashes.length === 0) {
      return { result: [] };
    }
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(testCaseDefsTable)
      .where(inArray(testCaseDefsTable.hash, hashes));
    return { result };
  },
);
