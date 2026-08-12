import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

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

/** Content-addressed export identity (shared across commits). */
export interface ExportDefEntity {
  hash: string;
  packageName: string;
  filePath: string;
  name: string;
  kind: ExportKind;
}

export const exportDefsTable = sqliteTable("export_defs", {
  hash: text("hash").primaryKey(),
  packageName: text("package_name").notNull(),
  filePath: text("file_path").notNull(),
  name: text("name").notNull(),
  kind: text("kind", { enum: exportKindEnum }).notNull(),
});

export type ExportDefEntityTest = Expect<
  Equal<ExportDefEntity, typeof exportDefsTable.$inferSelect>
>;
