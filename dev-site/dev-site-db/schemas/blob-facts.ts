import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import type { ExportKind } from "@saflib/parser";

export interface BlobExportFact {
  name: string;
  kind: ExportKind;
  /** Syntactic signature; null for re-exports without a local declaration. */
  signature: string | null;
  /** First prose line of leading JSDoc; null when absent or for bare re-exports. */
  docstring: string | null;
}

export interface BlobTestCaseFact {
  fullName: string;
}

export interface BlobTableColumnFact {
  propName: string;
  sqlName: string;
  typeKind: string;
}

export interface BlobTableFact {
  exportName: string;
  tableName: string;
  columns: BlobTableColumnFact[];
}

/**
 * Discriminated specialty for one blob. `exports` are on every kind; kind-only
 * props are `testCases` (test) and `tables` (sql-table).
 */
export type BlobSpecialty =
  | {
      kind: "source";
      exports: BlobExportFact[];
    }
  | {
      kind: "test";
      exports: BlobExportFact[];
      testCases: BlobTestCaseFact[];
    }
  | {
      kind: "sql-table";
      exports: BlobExportFact[];
      tables: BlobTableFact[];
    };

/** Path-agnostic parse results for one git blob. */
export interface BlobFactEntity {
  blobHash: string;
  analyzerVersion: string;
  lineCount: number;
  specialty: BlobSpecialty;
  computedAt: Date;
}

export function blobFactExports(fact: BlobFactEntity): BlobExportFact[] {
  return fact.specialty.exports;
}

export function blobFactTestCases(fact: BlobFactEntity): BlobTestCaseFact[] {
  return fact.specialty.kind === "test" ? fact.specialty.testCases : [];
}

export function blobFactTables(fact: BlobFactEntity): BlobTableFact[] {
  return fact.specialty.kind === "sql-table" ? fact.specialty.tables : [];
}

export const blobFactsTable = sqliteTable("blob_facts", {
  blobHash: text("blob_hash").primaryKey(),
  analyzerVersion: text("analyzer_version").notNull(),
  lineCount: integer("line_count").notNull(),
  specialty: text("specialty_json", { mode: "json" })
    .$type<BlobSpecialty>()
    .notNull(),
  computedAt: integer("computed_at", { mode: "timestamp" }).notNull(),
});

export type BlobFactEntityTest = Expect<
  Equal<BlobFactEntity, typeof blobFactsTable.$inferSelect>
>;
