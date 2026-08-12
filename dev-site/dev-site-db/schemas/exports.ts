import {
  index,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";
import { analyzedCommitsTable } from "./analyzed-commits.ts";

const exportKindEnum = [
  "function",
  "class",
  "interface",
  "type",
  "const",
  "enum",
  "variable",
] as const;
export type ExportKind = (typeof exportKindEnum)[number];

export interface ExportEntity {
  id: string;
  commitHash: string;
  packageName: string;
  filePath: string;
  name: string;
  kind: ExportKind;
}

export const exportsTable = sqliteTable(
  "exports",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    commitHash: text("commit_hash")
      .notNull()
      .references(() => analyzedCommitsTable.hash),
    packageName: text("package_name").notNull(),
    filePath: text("file_path").notNull(),
    name: text("name").notNull(),
    kind: text("kind", { enum: exportKindEnum }).notNull(),
  },
  (table) => [index("exports_commit_hash_idx").on(table.commitHash)],
);

export type ExportEntityTest = Expect<
  Equal<ExportEntity, typeof exportsTable.$inferSelect>
>;
