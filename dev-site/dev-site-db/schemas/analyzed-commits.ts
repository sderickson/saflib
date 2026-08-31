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
  is_main_ancestor: boolean;
}

export interface AnalyzedCommitEntity {
  hash: string;
  parent_hashes: string[];
  authored_at: Date;
  message: string;
  refs: AnalyzedCommitRef[];
  analyzer_version: string;
  computed_at: Date;
  status: AnalyzedCommitStatus;
  export_count: number;
  test_case_count: number;
}

export const analyzedCommitsTable = sqliteTable(
  "analyzed_commits",
  {
    hash: text("hash").primaryKey(),
    parent_hashes: text("parent_hashes", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    authored_at: integer("authored_at", { mode: "timestamp" }).notNull(),
    message: text("message").notNull(),
    refs: text("refs", { mode: "json" })
      .$type<AnalyzedCommitRef[]>()
      .notNull(),
    analyzer_version: text("analyzer_version").notNull(),
    computed_at: integer("computed_at", { mode: "timestamp" }).notNull(),
    status: text("status", { enum: analyzedCommitStatusEnum }).notNull(),
    export_count: integer("export_count").notNull(),
    test_case_count: integer("test_case_count").notNull(),
  },
  (table) => [index("analyzed_commits_authored_at_idx").on(table.authored_at)],
);

export type AnalyzedCommitEntityTest = Expect<
  Equal<AnalyzedCommitEntity, typeof analyzedCommitsTable.$inferSelect>
>;
