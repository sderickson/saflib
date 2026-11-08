import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

export const issueLevels = ["warn", "error", "fatal"] as const;
export type IssueLevel = (typeof issueLevels)[number];

/**
 * `open` and `regressed` need attention. A new occurrence of a `resolved`
 * issue makes it `regressed`; an `ignored` issue reopens when `ignored_until`
 * has passed (or stays ignored forever when it's null).
 */
export const issueStatuses = ["open", "resolved", "ignored", "regressed"] as const;
export type IssueStatus = (typeof issueStatuses)[number];

/** Where an issue came from: server exceptions, browser errors, CSP reports, leaking log lines. */
export type IssueKind = "server" | "client" | "csp" | "redaction" | "test";

export interface IssueGroup {
  id: string;
  fingerprint: string;
  level: IssueLevel;
  kind: string;
  /** First line of the first occurrence's message, redacted. Untrusted. */
  title: string;
  service_name: string | null;
  operation_name: string | null;
  first_seen: Date;
  last_seen: Date;
  count: number;
  first_seen_version: string | null;
  last_seen_version: string | null;
  status: IssueStatus;
  status_note: string | null;
  status_changed_at: Date | null;
  /** `ops_token:<id>`, a user id, or `system` (regressions, expiring ignores). */
  status_changed_by: string | null;
  resolved_in_version: string | null;
  ignored_until: Date | null;
}

export const issueGroups = sqliteTable(
  "issue_groups",
  {
    id: text("id").primaryKey(),
    fingerprint: text("fingerprint").notNull().unique(),
    level: text("level", { enum: issueLevels }).notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    service_name: text("service_name"),
    operation_name: text("operation_name"),
    first_seen: integer("first_seen", { mode: "timestamp_ms" }).notNull(),
    last_seen: integer("last_seen", { mode: "timestamp_ms" }).notNull(),
    count: integer("count").notNull(),
    first_seen_version: text("first_seen_version"),
    last_seen_version: text("last_seen_version"),
    status: text("status", { enum: issueStatuses }).notNull(),
    status_note: text("status_note"),
    status_changed_at: integer("status_changed_at", { mode: "timestamp_ms" }),
    status_changed_by: text("status_changed_by"),
    resolved_in_version: text("resolved_in_version"),
    ignored_until: integer("ignored_until", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("issue_groups_status_last_seen_idx").on(t.status, t.last_seen),
    index("issue_groups_first_seen_idx").on(t.first_seen),
  ],
);

export type IssueGroupTest1 = Expect<Equal<IssueGroup, typeof issueGroups.$inferSelect>>;

/** A recent sample of an issue (the newest N per group are kept). All text is redacted and untrusted. */
export interface IssueOccurrence {
  id: number;
  group_id: string;
  ts: Date;
  request_id: string | null;
  message: string;
  stack: string | null;
  fields: Record<string, unknown> | null;
  version: string | null;
}

export const issueOccurrences = sqliteTable(
  "issue_occurrences",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    group_id: text("group_id")
      .notNull()
      .references(() => issueGroups.id),
    ts: integer("ts", { mode: "timestamp_ms" }).notNull(),
    request_id: text("request_id"),
    message: text("message").notNull(),
    stack: text("stack"),
    fields: text("fields", { mode: "json" }).$type<Record<string, unknown>>(),
    version: text("version"),
  },
  (t) => [index("issue_occurrences_group_idx").on(t.group_id, t.id)],
);

export type IssueOccurrenceTest1 = Expect<Equal<IssueOccurrence, typeof issueOccurrences.$inferSelect>>;

/** Occurrences per issue per hour, for "busiest in the last N hours" without keeping every occurrence. */
export const issueHourlyCounts = sqliteTable(
  "issue_hourly_counts",
  {
    group_id: text("group_id")
      .notNull()
      .references(() => issueGroups.id),
    hour: integer("hour", { mode: "timestamp_ms" }).notNull(),
    count: integer("count").notNull(),
  },
  (t) => [primaryKey({ columns: [t.group_id, t.hour] }), index("issue_hourly_hour_idx").on(t.hour)],
);
