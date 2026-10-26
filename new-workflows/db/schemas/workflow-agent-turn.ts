import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";
import type { WorkflowRunAgentConfig } from "@saflib/new-workflows-spec";

const workflowAgentTurnStatus = ["success", "error", "cancelled"] as const;
export type WorkflowAgentTurnStatus = (typeof workflowAgentTurnStatus)[number];

type AgentCli = WorkflowRunAgentConfig["cli"];
const agentCli = ["cursor-agent", "claude-agent", "mock-agent"] as const;
export type WorkflowAgentTurnCliTest = Expect<
  Equal<(typeof agentCli)[number], AgentCli>
>;

/**
 * One agent CLI invocation (`runAgentTurn`) — written for every turn,
 * including TODO-retry turns inside one `update` step and freeform
 * messages. The audit trail for "why was this run slow / expensive" and
 * "were sessions actually reused": logs only hold what the agent *said*,
 * this holds what each turn *cost*.
 *
 * Timestamps are millisecond-precision (unlike `workflow_step`'s
 * second-precision ones) so short turns still get meaningful durations.
 * Metric columns are null when the CLI doesn't report them (cursor-agent,
 * mock-agent) or the turn died before reporting a result.
 */
export interface WorkflowAgentTurnEntity {
  id: string;
  /** The run whose step invoked the agent — a nested child's own id, not its root's. */
  run_id: string;
  step_index: number | null;
  /** The root run that owns the agent session this turn used (see `runAgentTurn`). */
  session_run_id: string;
  cli: AgentCli;
  model: string | null;
  /** Session id the CLI reported for this turn. */
  session_id: string | null;
  /** Session id passed to `--resume`, or null for a fresh session. */
  resumed_session_id: string | null;
  status: WorkflowAgentTurnStatus;
  error: string | null;
  /** CLI-reported result subtype, e.g. `success`, `error_max_turns`. */
  result_subtype: string | null;
  prompt_chars: number;
  started_at: Date;
  finished_at: Date;
  /** Time spent waiting on the model API, as reported by the CLI. */
  api_duration_ms: number | null;
  /** Model round-trips within this one CLI invocation. */
  num_turns: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_input_tokens: number | null;
  cache_creation_input_tokens: number | null;
  cost_usd: number | null;
}

export const workflowAgentTurnTable = sqliteTable(
  "workflow_agent_turn",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateShortId()),
    run_id: text("run_id").notNull(),
    step_index: integer("step_index"),
    session_run_id: text("session_run_id").notNull(),
    cli: text("cli", { enum: agentCli }).notNull(),
    model: text("model"),
    session_id: text("session_id"),
    resumed_session_id: text("resumed_session_id"),
    status: text("status", { enum: workflowAgentTurnStatus }).notNull(),
    error: text("error"),
    result_subtype: text("result_subtype"),
    prompt_chars: integer("prompt_chars").notNull(),
    started_at: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    finished_at: integer("finished_at", { mode: "timestamp_ms" }).notNull(),
    api_duration_ms: integer("api_duration_ms"),
    num_turns: integer("num_turns"),
    input_tokens: integer("input_tokens"),
    output_tokens: integer("output_tokens"),
    cache_read_input_tokens: integer("cache_read_input_tokens"),
    cache_creation_input_tokens: integer("cache_creation_input_tokens"),
    cost_usd: real("cost_usd"),
  },
  (table) => [
    index("workflow_agent_turn_run_id_idx").on(table.run_id),
    index("workflow_agent_turn_session_run_id_idx").on(table.session_run_id),
  ],
);

export type WorkflowAgentTurnEntityTest = Expect<
  Equal<WorkflowAgentTurnEntity, typeof workflowAgentTurnTable.$inferSelect>
>;
