import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { analyzedCommitsTable } from "./analyzed-commits.ts";
import { exportDefsTable } from "./exports.ts";

export interface CommitExportEntity {
  commitHash: string;
  exportHash: string;
}

export const commitExportsTable = sqliteTable(
  "commit_exports",
  {
    commitHash: text("commit_hash")
      .notNull()
      .references(() => analyzedCommitsTable.hash),
    exportHash: text("export_hash")
      .notNull()
      .references(() => exportDefsTable.hash),
  },
  (table) => [
    primaryKey({ columns: [table.commitHash, table.exportHash] }),
    index("commit_exports_commit_hash_idx").on(table.commitHash),
    index("commit_exports_export_hash_idx").on(table.exportHash),
  ],
);

export type CommitExportEntityTest = Expect<
  Equal<CommitExportEntity, typeof commitExportsTable.$inferSelect>
>;
