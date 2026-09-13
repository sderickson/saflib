import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";

/**
 * Output channels a step's stream can tag chunks with:
 * - `terminal`: raw stdout/stderr from a subprocess the workflow ran
 * - `agent`: output from the coding agent (what it said, what it executed)
 * - `tool`: the workflow engine's own narration
 * - `agent-input`: the prompt text sent to the agent
 */
const workflowLogChannel = [
  "terminal",
  "agent",
  "tool",
  "agent-input",
] as const;
export type WorkflowLogChannel = (typeof workflowLogChannel)[number];

const workflowLogLevel = ["info", "warn", "error"] as const;
export type WorkflowLogLevel = (typeof workflowLogLevel)[number];

export interface WorkflowLogEntity {
  id: string;
  run_id: string;
  step_index: number | null;
  channel: WorkflowLogChannel;
  level: WorkflowLogLevel;
  content: string;
  created_at: Date;
}

export const workflowLogTable = sqliteTable(
  "workflow_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    run_id: text("run_id").notNull(),
    step_index: integer("step_index"),
    channel: text("channel", { enum: workflowLogChannel }).notNull(),
    level: text("level", { enum: workflowLogLevel })
      .notNull()
      .default("info"),
    content: text("content").notNull(),
    created_at: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workflow_log_run_id_created_at_idx").on(
      table.run_id,
      table.created_at,
    ),
  ],
);

export type WorkflowLogEntityTest = Expect<
  Equal<WorkflowLogEntity, typeof workflowLogTable.$inferSelect>
>;
