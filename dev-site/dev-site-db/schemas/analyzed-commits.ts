import {
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

const analyzedCommitStatusEnum = ["pending", "complete", "failed"] as const;
export type AnalyzedCommitStatus = (typeof analyzedCommitStatusEnum)[number];

const analyzedCommitRefTypeEnum = ["branch", "tag"] as const;
export type AnalyzedCommitRefType = (typeof analyzedCommitRefTypeEnum)[number];

/** Branch/tag pointer observed at scan time — mirrors OpenAPI CommitRef. */
export interface AnalyzedCommitRef {
  name: string;
  type: AnalyzedCommitRefType;
  isMainAncestor: boolean;
}

export interface AnalyzedCommitEntity {
  hash: string;
  parentHashes: string[];
  authoredAt: Date;
  message: string;
  refs: AnalyzedCommitRef[];
  analyzerVersion: string;
  computed_at: Date;
  status: AnalyzedCommitStatus;
  exportCount: number;
  testCaseCount: number;
}

export const analyzedCommitsTable = sqliteTable(
  "analyzed_commits",
  {
    hash: text("hash").primaryKey(),
    parentHashes: text("parent_hashes", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    authoredAt: integer("authored_at", { mode: "timestamp" }).notNull(),
    message: text("message").notNull(),
    refs: text("refs", { mode: "json" })
      .$type<AnalyzedCommitRef[]>()
      .notNull(),
    analyzerVersion: text("analyzer_version").notNull(),
    computed_at: integer("computed_at", { mode: "timestamp" }).notNull(),
    status: text("status", { enum: analyzedCommitStatusEnum }).notNull(),
    exportCount: integer("export_count").notNull(),
    testCaseCount: integer("test_case_count").notNull(),
  },
  (table) => [index("analyzed_commits_authored_at_idx").on(table.authoredAt)],
);

export type AnalyzedCommitEntityTest = Expect<
  Equal<AnalyzedCommitEntity, typeof analyzedCommitsTable.$inferSelect>
>;
