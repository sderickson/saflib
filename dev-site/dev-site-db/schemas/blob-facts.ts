import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import type {
  FileExportFact,
  FileImportFact,
  FileSpecialty,
  FileTableColumnFact,
  FileTableFact,
  FileTestCaseFact,
} from "@saflib/imports/facts";

/** @deprecated Prefer FileExportFact from @saflib/imports/facts */
export type BlobExportFact = FileExportFact;
/** @deprecated Prefer FileImportFact */
export type BlobImportFact = FileImportFact;
/** @deprecated Prefer FileTestCaseFact */
export type BlobTestCaseFact = FileTestCaseFact;
/** @deprecated Prefer FileTableColumnFact */
export type BlobTableColumnFact = FileTableColumnFact;
/** @deprecated Prefer FileTableFact */
export type BlobTableFact = FileTableFact;
/** @deprecated Prefer FileSpecialty */
export type BlobSpecialty = FileSpecialty;

/** Path-agnostic parse results for one git blob (Sqlite adapter over FileFact). */
export interface BlobFactEntity {
  blobHash: string;
  analyzerVersion: string;
  lineCount: number;
  specialty: FileSpecialty;
  computedAt: Date;
}

export function blobFactExports(fact: BlobFactEntity): FileExportFact[] {
  return fact.specialty.exports;
}

export function blobFactImports(fact: BlobFactEntity): FileImportFact[] {
  return fact.specialty.imports;
}

export function blobFactTestCases(fact: BlobFactEntity): FileTestCaseFact[] {
  return fact.specialty.kind === "test" ? fact.specialty.testCases : [];
}

export function blobFactTables(fact: BlobFactEntity): FileTableFact[] {
  return fact.specialty.kind === "sql-table" ? fact.specialty.tables : [];
}

export const blobFactsTable = sqliteTable("blob_facts", {
  blobHash: text("blob_hash").primaryKey(),
  analyzerVersion: text("analyzer_version").notNull(),
  lineCount: integer("line_count").notNull(),
  specialty: text("specialty_json", { mode: "json" })
    .$type<FileSpecialty>()
    .notNull(),
  computedAt: integer("computed_at", { mode: "timestamp" }).notNull(),
});

export type BlobFactEntityTest = Expect<
  Equal<BlobFactEntity, typeof blobFactsTable.$inferSelect>
>;
