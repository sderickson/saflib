import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";
import type { WorkflowStepStatus } from "@saflib/new-workflows-spec";

export type { WorkflowStepStatus };

/**
 * Runtime values for drizzle's enum column — kept in sync with
 * `@saflib/new-workflows-spec`'s `WorkflowStepStatus` schema by the
 * `Expect<Equal<>>` guard below.
 */
const workflowStepStatus = [
  "running",
  "success",
  "error",
  "awaiting_prompt",
  "awaiting_user",
] as const;
export type WorkflowStepStatusTest = Expect<
  Equal<(typeof workflowStepStatus)[number], WorkflowStepStatus>
>;

export interface WorkflowStepEntity {
  id: string;
  run_id: string;
  step_index: number;
  kind: string;
  status: WorkflowStepStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  started_at: Date;
  finished_at: Date | null;
}

export const workflowStepTable = sqliteTable(
  "workflow_step",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    run_id: text("run_id").notNull(),
    step_index: integer("step_index").notNull(),
    kind: text("kind").notNull(),
    status: text("status", { enum: workflowStepStatus }).notNull(),
    result: text("result", { mode: "json" }).$type<Record<
      string,
      unknown
    > | null>(),
    error: text("error"),
    started_at: integer("started_at", { mode: "timestamp" }).notNull(),
    finished_at: integer("finished_at", { mode: "timestamp" }),
  },
  (table) => [
    index("workflow_step_run_id_idx").on(table.run_id),
    index("workflow_step_run_id_step_index_idx").on(
      table.run_id,
      table.step_index,
    ),
  ],
);

export type WorkflowStepEntityTest = Expect<
  Equal<WorkflowStepEntity, typeof workflowStepTable.$inferSelect>
>;
