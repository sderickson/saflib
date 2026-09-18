import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";
import type {
  WorkflowRunMode,
  WorkflowRunStatus,
  WorkflowRunAgentConfig,
} from "@saflib/new-workflows-spec";

export type { WorkflowRunMode, WorkflowRunStatus, WorkflowRunAgentConfig };

const workflowSource = ["code", "config"] as const;
export type WorkflowSource = (typeof workflowSource)[number];

/**
 * Runtime values for drizzle's enum column — kept in sync with
 * `@saflib/new-workflows-spec`'s `WorkflowRunMode` schema by the
 * `Expect<Equal<>>` guard below (a JSON schema's `enum` isn't a value
 * drizzle can read directly, so this array is hand-kept, not derived).
 */
const workflowRunMode = ["dry", "script", "print", "run", "checklist"] as const;
export type WorkflowRunModeTest = Expect<
  Equal<(typeof workflowRunMode)[number], WorkflowRunMode>
>;

const workflowRunStatus = [
  "pending",
  "running",
  "awaiting_prompt",
  "awaiting_user",
  "done",
  "failed",
] as const;
export type WorkflowRunStatusTest = Expect<
  Equal<(typeof workflowRunStatus)[number], WorkflowRunStatus>
>;

export interface WorkflowRunEntity {
  id: string;
  workflow_source: WorkflowSource;
  /** A code workflow's `defineWorkflow` id, or a `workflow_config` row id. */
  workflow_ref: string;
  input: Record<string, unknown>;
  mode: WorkflowRunMode;
  skip_todos: boolean;
  status: WorkflowRunStatus;
  current_step_index: number;
  cwd: string;
  agent_config: WorkflowRunAgentConfig | null;
  /**
   * The repo's `HEAD` commit hash at the moment this run was created, if
   * `cwd` resolved inside a git repo (best-effort — null otherwise, e.g. a
   * scratch/non-git cwd in tests). Bookends a run: the preview feature
   * diffs from here forward hypothetically; a "reflection" of what a run
   * actually did can diff from here to whatever `HEAD` is once it's done,
   * the same way, as long as nothing else committed to the repo meanwhile.
   */
  base_commit_hash: string | null;
  /**
   * The repo's `HEAD` commit hash at the moment this run first reached
   * `done`, if `cwd` resolved inside a git repo — captured once, right
   * then, not re-derived later (unlike a live `HEAD` lookup, this doesn't
   * drift as unrelated later work lands). Paired with `base_commit_hash`,
   * this is the run's "reflection": what it actually changed, isolated
   * from anything that happened before or after it. Null until the run is
   * done (or forever, for one that fails/never finishes).
   */
  completion_hash: string | null;
  /** Set when this run was spawned by a `call-workflow` step in another run. */
  parent_run_id: string | null;
  parent_step_index: number | null;
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
    skip_todos: integer("skip_todos", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: workflowRunStatus })
      .notNull()
      .default("pending"),
    current_step_index: integer("current_step_index").notNull().default(0),
    cwd: text("cwd").notNull(),
    agent_config: text("agent_config", { mode: "json" }).$type<
      WorkflowRunAgentConfig | null
    >(),
    base_commit_hash: text("base_commit_hash"),
    completion_hash: text("completion_hash"),
    parent_run_id: text("parent_run_id"),
    parent_step_index: integer("parent_step_index"),
    created_at: integer("created_at", { mode: "timestamp" }).notNull(),
    updated_at: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workflow_run_workflow_ref_idx").on(table.workflow_ref),
    index("workflow_run_status_idx").on(table.status),
    index("workflow_run_parent_idx").on(table.parent_run_id, table.parent_step_index),
  ],
);

export type WorkflowRunEntityTest = Expect<
  Equal<WorkflowRunEntity, typeof workflowRunTable.$inferSelect>
>;
