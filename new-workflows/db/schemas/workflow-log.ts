import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";
import type { WorkflowLogChannel, WorkflowLogLevel } from "@saflib/new-workflows-spec";

export type { WorkflowLogChannel, WorkflowLogLevel };

/**
 * Runtime values for drizzle's enum columns — kept in sync with
 * `@saflib/new-workflows-spec`'s `WorkflowLogChannel`/`WorkflowLogLevel`
 * schemas by the `Expect<Equal<>>` guards below.
 */
const workflowLogChannel = [
  "terminal",
  "agent",
  "tool",
  "agent-input",
] as const;
export type WorkflowLogChannelTest = Expect<
  Equal<(typeof workflowLogChannel)[number], WorkflowLogChannel>
>;

const workflowLogLevel = ["info", "warn", "error"] as const;
export type WorkflowLogLevelTest = Expect<
  Equal<(typeof workflowLogLevel)[number], WorkflowLogLevel>
>;

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
