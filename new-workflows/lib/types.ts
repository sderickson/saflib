import type { WorkflowRunMode } from "@saflib/new-workflows-db";

export type { WorkflowRunMode };

/**
 * Output channels a step's stream tags chunks with. See
 * `new-workflows/plans/spec.md` for the rationale — these mirror
 * `WorkflowLogChannel` in `@saflib/new-workflows-db`.
 */
export type Channel = "terminal" | "agent" | "tool" | "agent-input";
export type LogLevel = "info" | "warn" | "error";

export interface LogChunk {
  channel: Channel;
  level: LogLevel;
  content: string;
}

/** Agent CLI selectable per run. `claude-agent` is backlog (spec item 5). */
export type AgentCli = "cursor-agent" | "mock-agent";

export interface AgentConfig {
  cli: AgentCli;
  sessionId?: string;
}

/**
 * Context passed to every step function. Assembled by `advanceRun` from the
 * persisted `workflow_run` row plus the workflow definition's own `context()`.
 */
export interface WorkflowContext {
  runId: string;
  workflowId: string;
  mode: WorkflowRunMode;
  cwd: string;
  originalWorkingDirectory: string;
  agentConfig?: AgentConfig;
  /** Absolute paths of files copied so far in this run, keyed by template file id. */
  copiedFiles: Record<string, string>;
  skipTodos?: boolean;
  /** Emits one chunk onto this step's output stream. */
  log: (chunk: LogChunk) => void;
}

/**
 * Result of running exactly one step. `lib` never inspects this to decide
 * whether to keep going — the caller does. See spec.md's "lib never
 * continues" decision.
 */
export type StepResult =
  | { status: "success"; result?: Record<string, unknown> }
  | { status: "error"; message: string; errorPrompt?: string }
  | { status: "awaiting_prompt"; prompt: string }
  | { status: "awaiting_user"; message: string }
  /** No more steps to run — returned without executing anything. */
  | { status: "done" };

/** What a single step primitive can return — `"done"` is engine-only (no more steps). */
export type StepOutcome = Exclude<StepResult, { status: "done" }>;

export type StepFn<Input> = (
  input: Input,
  ctx: WorkflowContext,
) => Promise<StepOutcome>;

export interface WorkflowStep<C> {
  kind: string;
  /** Builds this step's input from the workflow's own context. */
  input: (ctx: { context: C }) => unknown;
  run: StepFn<unknown>;
}

export interface WorkflowDefinition<Input = unknown, C = unknown> {
  id: string;
  description: string;
  context: (arg: { input: Input; cwd: string }) => C;
  steps: WorkflowStep<C>[];
}
