import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";

const jobStatus = [
  "pending",
  "running",
  "retrying",
  "succeeded",
  "dead",
  "cancelled",
] as const;
export type JobStatus = (typeof jobStatus)[number];

const jobTerminalReason = [
  "exhausted",
  "permanent-status",
  "rejected-by-endpoint",
  "auth-unresolvable",
  "cancelled-by-admin",
  "cancelled-by-chain",
] as const;
export type JobTerminalReason = (typeof jobTerminalReason)[number];

/** Capped request payload delivered to the target operation (≤ 16 KB serialized). */
export interface JobRequest {
  path_params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
}

/** Enqueue-hop identity assertion stored with the authority grant. */
export interface JobAuthorityAssertion {
  payload: string;
  signature: string;
  key_id: string;
}

/**
 * Root grant for the job chain, including the embedded enqueue assertion.
 * Wire form omits `assertion` (returned separately as `authority_assertion`).
 */
export type JobAuthority =
  | {
      kind: "request";
      user_id: string;
      request_id: string;
      assertion: JobAuthorityAssertion;
    }
  | {
      kind: "resource";
      user_id: string;
      resource_kind: string;
      resource_id: string;
      assertion: JobAuthorityAssertion;
    }
  | {
      kind: "cron";
      user_id: string;
      cron_job_name: string;
      assertion: JobAuthorityAssertion;
    };

/** Outcome of a terminal or failed attempt; `error_body` only on failure (≤ 8 KB). */
export interface JobResult {
  status_code?: number;
  error_body?: string | null;
  terminal_reason?: JobTerminalReason | null;
}

export interface JobEntity {
  id: string;
  status: JobStatus;
  operation_id: string;
  request: JobRequest;
  user_id: string;
  authority: JobAuthority;
  original_request_id: string;
  enqueued_by_operation_id: string;
  parent_job_id: string | null;
  run_at: Date;
  dedupe_key: string | null;
  concurrency_key: string | null;
  priority: number;
  attempt: number;
  max_attempts: number;
  heartbeat_at: Date | null;
  result: JobResult | null;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
}

export const jobTable = sqliteTable(
  "job",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    status: text("status", { enum: jobStatus }).notNull(),
    operation_id: text("operation_id").notNull(),
    request: text("request", { mode: "json" }).$type<JobRequest>().notNull(),
    user_id: text("user_id").notNull(),
    authority: text("authority", { mode: "json" })
      .$type<JobAuthority>()
      .notNull(),
    original_request_id: text("original_request_id").notNull(),
    enqueued_by_operation_id: text("enqueued_by_operation_id").notNull(),
    parent_job_id: text("parent_job_id"),
    run_at: integer("run_at", { mode: "timestamp" }).notNull(),
    dedupe_key: text("dedupe_key"),
    concurrency_key: text("concurrency_key"),
    priority: integer("priority").notNull().default(0),
    attempt: integer("attempt").notNull().default(0),
    max_attempts: integer("max_attempts").notNull(),
    heartbeat_at: integer("heartbeat_at", { mode: "timestamp" }),
    result: text("result", { mode: "json" }).$type<JobResult | null>(),
    created_at: integer("created_at", { mode: "timestamp" }).notNull(),
    updated_at: integer("updated_at", { mode: "timestamp" }).notNull(),
    started_at: integer("started_at", { mode: "timestamp" }),
    finished_at: integer("finished_at", { mode: "timestamp" }),
  },
  (table) => [
    index("job_status_run_at_priority_idx").on(
      table.status,
      table.run_at,
      table.priority,
    ),
    index("job_original_request_id_idx").on(table.original_request_id),
    index("job_concurrency_key_idx").on(table.concurrency_key),
    index("job_finished_at_idx").on(table.finished_at),
    uniqueIndex("job_dedupe_key_queued_uidx")
      .on(table.dedupe_key)
      .where(sql`${table.status} IN ('pending', 'retrying')`),
  ],
);

export type JobEntityTest = Expect<Equal<JobEntity, typeof jobTable.$inferSelect>>;
