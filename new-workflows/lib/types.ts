import type { DbKey } from "@saflib/drizzle";
import type {
  WorkflowRunMode,
  WorkflowLogChannel,
  WorkflowLogLevel,
  WorkflowRunAgentConfig,
} from "@saflib/new-workflows-db";

export type { WorkflowRunMode };

/**
 * Output channels a step's stream tags chunks with — `@saflib/
 * new-workflows-spec`'s `WorkflowLogChannel`/`WorkflowLogLevel` schemas
 * are the contract; `new-workflows-db` re-exports them (guarded against
 * drift there), and this just aliases to the names used throughout `lib`.
 */
export type Channel = WorkflowLogChannel;
export type LogLevel = WorkflowLogLevel;

export interface LogChunk {
  channel: Channel;
  level: LogLevel;
  content: string;
}

/**
 * Agent CLI + session, per the spec's `WorkflowRunAgentConfig` schema —
 * that schema is the contract for this shape, not this interface.
 * `claude-agent` joining the `cli` enum is backlog (spec item 5).
 */
export type AgentConfig = WorkflowRunAgentConfig;
export type AgentCli = AgentConfig["cli"];

/**
 * Context passed to every step function. Assembled by `advanceRun` from the
 * persisted `workflow_run` row plus the workflow definition's own `context()`.
 */
export interface WorkflowContext {
  runId: string;
  workflowId: string;
  /**
   * Index of the step currently executing. Internal — used by
   * `call-workflow` (`steps/call-workflow.ts`) to key its child run
   * lookup; ordinary step authors don't need it.
   */
  stepIndex: number;
  /**
   * The db key for this run's connection. Internal — used by
   * `call-workflow` to create/advance a child run; ordinary step authors
   * shouldn't need direct db access (use `log` to communicate instead).
   */
  dbKey: DbKey;
  mode: WorkflowRunMode;
  cwd: string;
  originalWorkingDirectory: string;
  agentConfig?: AgentConfig;
  /** Absolute paths of files copied so far in this run, keyed by template file id. */
  copiedFiles: Record<string, string>;
  skipTodos?: boolean;
  /**
   * True when a prior attempt already ran this exact step index (the
   * caller is resuming after `awaiting_prompt`/`awaiting_user`/`error`,
   * e.g. via the CLI's `next`). In `print` mode this is what tells
   * `prompt`/`update` "the external agent says it's done" rather than
   * "emit the prompt for the first time".
   */
  isResume: boolean;
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

/**
 * Deliberately small JSON-Schema-*shaped* subset — just enough for a CLI (or
 * future dev-site form) to coerce named args into a workflow's input. Not a
 * general validator: no nesting, no `oneOf`, no patterns.
 */
export interface WorkflowInputSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: "string" | "boolean" | "number";
      description?: string;
      default?: string | boolean | number;
    }
  >;
  required?: string[];
}

export interface WorkflowDefinition<Input = unknown, C = unknown> {
  id: string;
  description: string;
  /** Omit for workflows with no CLI-relevant input (e.g. config-authored only). */
  inputSchema?: WorkflowInputSchema;
  context: (arg: { input: Input; cwd: string }) => C;
  steps: WorkflowStep<C>[];
}
