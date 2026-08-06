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
  pathParams?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
}

/** Enqueue-hop identity assertion stored with the authority grant. */
export interface JobAuthorityAssertion {
  payload: string;
  signature: string;
  keyId: string;
}

/**
 * Root grant for the job chain, including the embedded enqueue assertion.
 * Wire form omits `assertion` (returned separately as `authorityAssertion`).
 */
export type JobAuthority =
  | {
      kind: "request";
      userId: string;
      requestId: string;
      assertion: JobAuthorityAssertion;
    }
  | {
      kind: "importer";
      userId: string;
      importerId: string;
      assertion: JobAuthorityAssertion;
    }
  | {
      kind: "cron";
      userId: string;
      cronJobName: string;
      assertion: JobAuthorityAssertion;
    };

/** Outcome of a terminal or failed attempt; `errorBody` only on failure (≤ 8 KB). */
export interface JobResult {
  statusCode?: number;
  errorBody?: string | null;
  terminalReason?: JobTerminalReason | null;
}

export interface JobEntity {
  id: string;
  status: JobStatus;
  operationId: string;
  request: JobRequest;
  userId: string;
  authority: JobAuthority;
  originalRequestId: string;
  enqueuedByOperationId: string;
  parentJobId: string | null;
  runAt: Date;
  dedupeKey: string | null;
  concurrencyKey: string | null;
  priority: number;
  attempt: number;
  maxAttempts: number;
  heartbeatAt: Date | null;
  result: JobResult | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export const jobTable = sqliteTable(
  "job",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    status: text("status", { enum: jobStatus }).notNull(),
    operationId: text("operation_id").notNull(),
    request: text("request", { mode: "json" }).$type<JobRequest>().notNull(),
    userId: text("user_id").notNull(),
    authority: text("authority", { mode: "json" })
      .$type<JobAuthority>()
      .notNull(),
    originalRequestId: text("original_request_id").notNull(),
    enqueuedByOperationId: text("enqueued_by_operation_id").notNull(),
    parentJobId: text("parent_job_id"),
    runAt: integer("run_at", { mode: "timestamp" }).notNull(),
    dedupeKey: text("dedupe_key"),
    concurrencyKey: text("concurrency_key"),
    priority: integer("priority").notNull().default(0),
    attempt: integer("attempt").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull(),
    heartbeatAt: integer("heartbeat_at", { mode: "timestamp" }),
    result: text("result", { mode: "json" }).$type<JobResult | null>(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    startedAt: integer("started_at", { mode: "timestamp" }),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
  },
  (table) => [
    index("job_status_run_at_priority_idx").on(
      table.status,
      table.runAt,
      table.priority,
    ),
    index("job_original_request_id_idx").on(table.originalRequestId),
    index("job_concurrency_key_idx").on(table.concurrencyKey),
    index("job_finished_at_idx").on(table.finishedAt),
    uniqueIndex("job_dedupe_key_live_uidx")
      .on(table.dedupeKey)
      .where(
        sql`${table.status} IN ('pending', 'running', 'retrying')`,
      ),
  ],
);

export type JobEntityTest = Expect<Equal<JobEntity, typeof jobTable.$inferSelect>>;
