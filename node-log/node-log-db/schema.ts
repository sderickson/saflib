import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

/** Winston npm levels, most to least severe; `level_num` is the index. */
export const logLevels = ["error", "warn", "info", "http", "verbose", "debug", "silly"] as const;
export type LogLevel = (typeof logLevels)[number];

/**
 * What a line belongs to, so lines from one request, job delivery, cron tick
 * or process startup can be grouped. Lines outside all of those have none.
 */
export const logContextKinds = ["request", "job", "cron", "process"] as const;
export type LogContextKind = (typeof logContextKinds)[number];

/**
 * One persisted log line, already redacted. `message` and `fields` can still
 * contain text that originated outside the app (paths, error messages), so
 * readers must treat them as untrusted.
 *
 * Full-text search uses the `log_entries_fts` FTS5 table, kept in sync by
 * triggers (see the custom migration).
 */
export interface LogEntry {
  id: number;
  ts: Date;
  level: string;
  level_num: number;
  service_name: string | null;
  subsystem_name: string | null;
  operation_name: string | null;
  request_id: string | null;
  /** Pseudonymous user id (an identifier, never an email or name). */
  user_id: string | null;
  /** What the line belongs to; see {@link logContextKinds}. */
  context_kind: string | null;
  /** Request id, job id, cron tick id or process id, per `context_kind`. */
  context_id: string | null;
  template_hash: string;
  message: string;
  fields: Record<string, unknown> | null;
  /** How many values were masked in this line. */
  redactions: number;
  /**
   * The product event's name when this line is one (`analytics.capture`);
   * null for ordinary log lines. Kept longer than other lines.
   */
  event: string | null;
}

export const logEntries = sqliteTable(
  "log_entries",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    ts: integer("ts", { mode: "timestamp_ms" }).notNull(),
    level: text("level").notNull(),
    level_num: integer("level_num").notNull(),
    service_name: text("service_name"),
    subsystem_name: text("subsystem_name"),
    operation_name: text("operation_name"),
    request_id: text("request_id"),
    user_id: text("user_id"),
    context_kind: text("context_kind"),
    context_id: text("context_id"),
    template_hash: text("template_hash").notNull(),
    message: text("message").notNull(),
    fields: text("fields", { mode: "json" }).$type<Record<string, unknown>>(),
    redactions: integer("redactions").notNull().default(0),
    event: text("event"),
  },
  (t) => [
    index("log_entries_ts_idx").on(t.ts),
    index("log_entries_level_ts_idx").on(t.level_num, t.ts),
    index("log_entries_request_idx").on(t.request_id),
    index("log_entries_context_idx").on(t.context_id, t.id),
    index("log_entries_user_idx").on(t.user_id, t.id),
    index("log_entries_template_ts_idx").on(t.template_hash, t.ts),
    index("log_entries_event_ts_idx").on(t.event, t.ts),
  ],
);

export type LogEntryTest1 = Expect<Equal<LogEntry, typeof logEntries.$inferSelect>>;

/**
 * A normalized message shape. A template first seen recently is a "new
 * behavior" worth a look.
 */
export interface LogTemplate {
  hash: string;
  template: string;
  /** Level of the first line seen with this template. */
  level: string;
  service_name: string | null;
  first_seen: Date;
  last_seen: Date;
  /** Lines seen since the template was first recorded. */
  count: number;
}

export const logTemplates = sqliteTable(
  "log_templates",
  {
    hash: text("hash").primaryKey(),
    template: text("template").notNull(),
    level: text("level").notNull(),
    service_name: text("service_name"),
    first_seen: integer("first_seen", { mode: "timestamp_ms" }).notNull(),
    last_seen: integer("last_seen", { mode: "timestamp_ms" }).notNull(),
    count: integer("count").notNull(),
  },
  (t) => [
    index("log_templates_first_seen_idx").on(t.first_seen),
    index("log_templates_last_seen_idx").on(t.last_seen),
  ],
);

export type LogTemplateTest1 = Expect<Equal<LogTemplate, typeof logTemplates.$inferSelect>>;
