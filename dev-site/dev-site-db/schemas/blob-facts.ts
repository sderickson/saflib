import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import type { ExportKind } from "@saflib/parser";

export interface BlobExportFact {
  name: string;
  kind: ExportKind;
  /** Syntactic signature; null for re-exports without a local declaration. */
  signature: string | null;
}

export interface BlobTestCaseFact {
  fullName: string;
}

/** Path-agnostic parse results for one git blob. */
export interface BlobFactEntity {
  blobHash: string;
  analyzerVersion: string;
  lineCount: number;
  exports: BlobExportFact[];
  testCases: BlobTestCaseFact[];
  computedAt: Date;
}

export const blobFactsTable = sqliteTable("blob_facts", {
  blobHash: text("blob_hash").primaryKey(),
  analyzerVersion: text("analyzer_version").notNull(),
  lineCount: integer("line_count").notNull(),
  exports: text("exports_json", { mode: "json" })
    .$type<BlobExportFact[]>()
    .notNull(),
  testCases: text("test_cases_json", { mode: "json" })
    .$type<BlobTestCaseFact[]>()
    .notNull(),
  computedAt: integer("computed_at", { mode: "timestamp" }).notNull(),
});

export type BlobFactEntityTest = Expect<
  Equal<BlobFactEntity, typeof blobFactsTable.$inferSelect>
>;
