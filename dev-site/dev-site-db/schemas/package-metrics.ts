import {
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";
import { analyzedCommitsTable } from "./analyzed-commits.ts";

export interface PackageMetricsEntity {
  id: string;
  commitHash: string;
  packageName: string;
  directory: string;
  sourceFiles: number;
  sourceLines: number;
  prodLines: number;
  testLines: number;
  testFiles: number;
}

export const packageMetricsTable = sqliteTable(
  "package_metrics",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    commitHash: text("commit_hash")
      .notNull()
      .references(() => analyzedCommitsTable.hash),
    packageName: text("package_name").notNull(),
    directory: text("directory").notNull(),
    sourceFiles: integer("source_files").notNull(),
    sourceLines: integer("source_lines").notNull(),
    prodLines: integer("prod_lines").notNull(),
    testLines: integer("test_lines").notNull(),
    testFiles: integer("test_files").notNull(),
  },
  (table) => [
    index("package_metrics_commit_hash_idx").on(table.commitHash),
  ],
);

export type PackageMetricsEntityTest = Expect<
  Equal<PackageMetricsEntity, typeof packageMetricsTable.$inferSelect>
>;
