import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

/**
 * The agent CLI's raw stdout for one `workflow_agent_turn`, exactly as
 * printed (NDJSON for both claude and cursor). Kept for debugging the
 * adapters' parsing — cursor's `stream-json` shape isn't documented.
 * Capped per turn: it keeps the first and last chunk of output, and
 * `omitted_chars` counts what was cut from the middle.
 *
 * Its own table so turn listings don't drag megabytes of output along.
 */
export interface WorkflowAgentTurnRawEntity {
  /** `workflow_agent_turn.id`. */
  turn_id: string;
  output: string;
  /** Characters cut from the middle of `output` to fit the cap; 0 when complete. */
  omitted_chars: number;
  created_at: Date;
}

export const workflowAgentTurnRawTable = sqliteTable("workflow_agent_turn_raw", {
  turn_id: text("turn_id").primaryKey(),
  output: text("output").notNull(),
  omitted_chars: integer("omitted_chars").notNull(),
  created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type WorkflowAgentTurnRawEntityTest = Expect<
  Equal<WorkflowAgentTurnRawEntity, typeof workflowAgentTurnRawTable.$inferSelect>
>;
