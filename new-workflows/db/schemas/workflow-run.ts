import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";

const workflowSource = ["code", "config"] as const;
export type WorkflowSource = (typeof workflowSource)[number];

/** Same execution modes as today's engine: see `@saflib/workflows` docs. */
const workflowRunMode = ["dry", "script", "print", "run", "checklist"] as const;
export type WorkflowRunMode = (typeof workflowRunMode)[number];

const workflowRunStatus = [
  "pending",
  "running",
  "awaiting_prompt",
  "awaiting_user",
  "done",
  "failed",
] as const;
export type WorkflowRunStatus = (typeof workflowRunStatus)[number];

/** Agent CLI + session/timeout state for a run, opaque to the db layer. */
export type WorkflowRunAgentConfig = Record<string, unknown>;

export interface WorkflowRunEntity {
  id: string;
  workflow_source: WorkflowSource;
  /** A code workflow's `defineWorkflow` id, or a `workflow_config` row id. */
  workflow_ref: string;
  input: Record<string, unknown>;
  mode: WorkflowRunMode;
  status: WorkflowRunStatus;
  current_step_index: number;
  cwd: string;
  agent_config: WorkflowRunAgentConfig | null;
  created_at: Date;
  updated_at: Date;
}

export const workflowRunTable = sqliteTable(
  "workflow_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    workflow_source: text("workflow_source", {
      enum: workflowSource,
    }).notNull(),
    workflow_ref: text("workflow_ref").notNull(),
    input: text("input", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    mode: text("mode", { enum: workflowRunMode }).notNull().default("print"),
    status: text("status", { enum: workflowRunStatus })
      .notNull()
      .default("pending"),
    current_step_index: integer("current_step_index").notNull().default(0),
    cwd: text("cwd").notNull(),
    agent_config: text("agent_config", { mode: "json" }).$type<
      WorkflowRunAgentConfig | null
    >(),
    created_at: integer("created_at", { mode: "timestamp" }).notNull(),
    updated_at: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workflow_run_workflow_ref_idx").on(table.workflow_ref),
    index("workflow_run_status_idx").on(table.status),
  ],
);

export type WorkflowRunEntityTest = Expect<
  Equal<WorkflowRunEntity, typeof workflowRunTable.$inferSelect>
>;
