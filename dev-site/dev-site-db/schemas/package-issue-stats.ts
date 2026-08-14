import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";
import { analyzedCommitsTable } from "./analyzed-commits.ts";

export const packageIssueKinds = [
  "dead-code",
  "same-file-only-export",
  "oversized-file",
  "package-layout",
] as const;

export type PackageIssueKind = (typeof packageIssueKinds)[number];

export interface PackageIssueStatsEntity {
  id: string;
  commitHash: string;
  packageName: string;
  kind: PackageIssueKind;
  count: number;
}

export const packageIssueStatsTable = sqliteTable(
  "package_issue_stats",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    commitHash: text("commit_hash")
      .notNull()
      .references(() => analyzedCommitsTable.hash),
    packageName: text("package_name").notNull(),
    kind: text("kind", { enum: packageIssueKinds }).notNull(),
    count: integer("count").notNull(),
  },
  (table) => [
    index("package_issue_stats_commit_hash_idx").on(table.commitHash),
    uniqueIndex("package_issue_stats_commit_pkg_kind_uidx").on(
      table.commitHash,
      table.packageName,
      table.kind,
    ),
  ],
);

export type PackageIssueStatsEntityTest = Expect<
  Equal<PackageIssueStatsEntity, typeof packageIssueStatsTable.$inferSelect>
>;
