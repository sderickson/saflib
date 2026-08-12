import {
  index,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";
import { analyzedCommitsTable } from "./analyzed-commits.ts";

export interface TestCaseEntity {
  id: string;
  commitHash: string;
  packageName: string;
  filePath: string;
  fullName: string;
}

export const testCasesTable = sqliteTable(
  "test_cases",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    commitHash: text("commit_hash")
      .notNull()
      .references(() => analyzedCommitsTable.hash),
    packageName: text("package_name").notNull(),
    filePath: text("file_path").notNull(),
    fullName: text("full_name").notNull(),
  },
  (table) => [index("test_cases_commit_hash_idx").on(table.commitHash)],
);

export type TestCaseEntityTest = Expect<
  Equal<TestCaseEntity, typeof testCasesTable.$inferSelect>
>;
