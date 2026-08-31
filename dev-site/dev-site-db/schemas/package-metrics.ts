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
  commit_hash: string;
  package_name: string;
  directory: string;
  source_files: number;
  source_lines: number;
  prod_lines: number;
  test_lines: number;
  test_files: number;
}

export const packageMetricsTable = sqliteTable(
  "package_metrics",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    commit_hash: text("commit_hash")
      .notNull()
      .references(() => analyzedCommitsTable.hash),
    package_name: text("package_name").notNull(),
    directory: text("directory").notNull(),
    source_files: integer("source_files").notNull(),
    source_lines: integer("source_lines").notNull(),
    prod_lines: integer("prod_lines").notNull(),
    test_lines: integer("test_lines").notNull(),
    test_files: integer("test_files").notNull(),
  },
  (table) => [
    index("package_metrics_commit_hash_idx").on(table.commit_hash),
  ],
);

export type PackageMetricsEntityTest = Expect<
  Equal<PackageMetricsEntity, typeof packageMetricsTable.$inferSelect>
>;
