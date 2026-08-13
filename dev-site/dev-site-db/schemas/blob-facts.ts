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

export interface BlobImportFact {
  specifier: string;
  names: string[];
}

export interface BlobTestCaseFact {
  fullName: string;
}

export interface BlobTableColumnFact {
  propName: string;
  sqlName: string;
  typeKind: string;
  /** First prose line of leading JSDoc; null when absent. */
  docstring: string | null;
}

export interface BlobTableFact {
  exportName: string;
  tableName: string;
  /** First prose line of leading JSDoc on the table const; null when absent. */
  docstring: string | null;
  columns: BlobTableColumnFact[];
}

/**
 * Discriminated specialty for one blob. `exports` and `imports` are on every
 * kind; kind-only props are `testCases` (test) and `tables` (sql-table).
 */
export type BlobSpecialty =
  | {
      kind: "source";
      exports: BlobExportFact[];
      imports: BlobImportFact[];
    }
  | {
      kind: "test";
      exports: BlobExportFact[];
      imports: BlobImportFact[];
      testCases: BlobTestCaseFact[];
    }
  | {
      kind: "sql-table";
      exports: BlobExportFact[];
      imports: BlobImportFact[];
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

export function blobFactImports(fact: BlobFactEntity): BlobImportFact[] {
  return fact.specialty.imports;
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
