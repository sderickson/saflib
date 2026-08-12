import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

/** Content-addressed test-case identity (shared across commits). */
export interface TestCaseDefEntity {
  hash: string;
  packageName: string;
  filePath: string;
  fullName: string;
}

export const testCaseDefsTable = sqliteTable("test_case_defs", {
  hash: text("hash").primaryKey(),
  packageName: text("package_name").notNull(),
  filePath: text("file_path").notNull(),
  fullName: text("full_name").notNull(),
});

export type TestCaseDefEntityTest = Expect<
  Equal<TestCaseDefEntity, typeof testCaseDefsTable.$inferSelect>
>;
