import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { analyzedCommitsTable } from "./analyzed-commits.ts";
import { testCaseDefsTable } from "./test-cases.ts";

export interface CommitTestCaseEntity {
  commitHash: string;
  testCaseHash: string;
}

export const commitTestCasesTable = sqliteTable(
  "commit_test_cases",
  {
    commitHash: text("commit_hash")
      .notNull()
      .references(() => analyzedCommitsTable.hash),
    testCaseHash: text("test_case_hash")
      .notNull()
      .references(() => testCaseDefsTable.hash),
  },
  (table) => [
    primaryKey({ columns: [table.commitHash, table.testCaseHash] }),
    index("commit_test_cases_commit_hash_idx").on(table.commitHash),
    index("commit_test_cases_test_case_hash_idx").on(table.testCaseHash),
  ],
);

export type CommitTestCaseEntityTest = Expect<
  Equal<CommitTestCaseEntity, typeof commitTestCasesTable.$inferSelect>
>;
