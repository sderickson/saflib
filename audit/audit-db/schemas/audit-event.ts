import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { generateShortId } from "@saflib/drizzle";

export const auditSources = ["http", "cron", "kratos", "system", "webhook"] as const;
export type AuditSource = (typeof auditSources)[number];

/**
 * Stored `details` JSON (see audit-log spec). The `source` discriminator matches the
 * row's `source` column so archived rows remain self-describing under ATTACH.
 */
export type AuditEventDetails =
  | {
      source: "http";
      method: string;
      route_pattern: string;
      path_params: Record<string, string>;
      query_params: Record<string, string | string[]>;
      status_code: number;
      duration_ms: number;
      user_agent?: string;
      operation_id?: string;
    }
  | {
      source: "cron";
      job_name: string;
      run_id: string;
      phase: "start" | "end";
      duration_ms?: number;
      summary?: Record<string, unknown>;
      error?: { name: string; message: string };
    }
  | {
      source: "kratos";
      stage: string;
      flow_id: string;
      identity_id: string;
      success: boolean;
      methods?: string[];
      error_reason?: string;
      user_agent?: string;
      accept_language?: string;
    }
  | {
      source: "system";
      operation: string;
      summary?: Record<string, unknown>;
    }
  | { source: "webhook"; [k: string]: unknown };

export const auditEventTable = sqliteTable(
  "audit_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    ts: integer("ts", { mode: "timestamp_ms" }).notNull(),
    prev_hash: text("prev_hash").notNull(),
    row_hash: text("row_hash").notNull(),
    schema_version: integer("schema_version").notNull().default(1),
    source: text("source", { enum: auditSources }).notNull(),
    actor_user_id: text("actor_user_id"),
    on_behalf_of_user_id: text("on_behalf_of_user_id"),
    auth_method: text("auth_method"),
    request_id: text("request_id"),
    client_ip: text("client_ip"),
    event_type: text("event_type").notNull(),
    resource_type: text("resource_type"),
    resource_id: text("resource_id"),
    outcome: text("outcome").notNull(),
    git_commit_root: text("git_commit_root").notNull(),
    git_commit_saflib: text("git_commit_saflib").notNull(),
    env: text("env").notNull(),
    details: text("details", { mode: "json" }).$type<AuditEventDetails | null>(),
  },
  (table) => [
    index("audit_event_ts_idx").on(table.ts),
    index("audit_event_resource_idx").on(table.resource_type, table.resource_id),
    index("audit_event_event_type_idx").on(table.event_type),
    index("audit_event_actor_idx").on(table.actor_user_id),
    index("audit_event_request_id_idx").on(table.request_id),
  ],
);

export type AuditEventEntity = typeof auditEventTable.$inferSelect;
