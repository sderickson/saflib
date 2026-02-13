import {
  type AnyEventObject,
  type AnyStateMachine,
  type Values,
  type NonReducibleUnknown,
  type ActionFunction,
  type InputFrom,
  type PromiseActorLogic,
  type MachineContext,
} from "xstate";

/**
 * A step in a workflow with an actor and its corresponding input.
 */
export type WorkflowStep<C, M extends AnyStateMachine> = {
  /**
   * The state machine for the step. Either a core step or a workflow definition which has been converted to a state machine with `makeWorkflowMachine`.
   */
  machine: M;

  /**
   * The input for the step, based on the context for the invoking workflow.
   */
  input: (arg: { context: C & WorkflowContext }) => InputFrom<M>;

  /**
   * A function that validates the step after it has been executed. If it returns a string, that string is prompted to the agent and the workflow is kept from moving forward until the validate function returns undefined.
   */
  validate: (arg: {
    context: C & WorkflowContext;
  }) => Promise<string | undefined>;

  /**
   * A function that determines if the step should be skipped.
   */
  skipIf: (arg: { context: C & WorkflowContext }) => boolean;

  /**
   * Whether to commit the changes after the step has been executed, and with what message.
   */
  commitAfter?: {
    message: string | ((arg: { context: C & WorkflowContext }) => string);
  };
};

/**
 * An interface that includes everything that makes up a workflow.
 */
export interface WorkflowDefinition<
  I extends readonly WorkflowArgument[] = any,
  C = any,
> {
  /**
   * The input specific to this workflow.
   */
  input: I;

  /**
   * The context specific to this workflow, generated from the input and available to use in each step.
   */
  context: (arg: { input: CreateArgsType<I> & { cwd: string } }) => C;

  /**
   * Unique id for the workflow, for invoking it with the CLI tool.
   */
  id: string;

  /**
   * The source URL of the workflow. Set to import.meta.url.
   */
  sourceUrl: string;

  /**
   * Description of the workflow which will be shown in the CLI tool.
   */
  description: string;

  /**
   * Description that will be printed when the workflow itself is part of a checklist.
   * Experimental! Still need to experiment with workflows in workflows.
   */
  checklistDescription?: (context: C) => string;

  /**
   * A map of ids to template file absolute paths which will be copied and updated as part of the workflow.
   */
  templateFiles: Record<string, string>;

  /**
   * A map of ids to doc file absolute paths which will be referenced as part of the workflow.
   */
  docFiles: Record<string, string>;

  /**
   * An array of steps to be executed in the workflow. Each step is a state machine, and a function which takes the context and returns the input for the state machine.
   */
  steps: Array<WorkflowStep<C, AnyStateMachine>>;

  /**
   * Configure version control for the workflow. Right now, just provide paths which the workflow will consider safe to change as part of the workflow.
   */
  versionControl?: {
    allowPaths?: string[] | (({ context }: { context: C }) => string[]);
  };
}

type ArrayElementType<T extends readonly unknown[]> = T[number];
type ExtractKeys<T extends readonly { name: string }[]> =
  ArrayElementType<T>["name"];
type FindArg<T extends readonly { name: string }[], K extends string> = Extract<
  ArrayElementType<T>,
  { name: K }
>;
/** Keys of T that are flag-type args (optional when invoking the workflow). */
type FlagKeys<T extends readonly WorkflowArgument[]> = {
  [K in ExtractKeys<T>]: FindArg<T, K> extends { type: "flag" } ? K : never;
}[ExtractKeys<T>];
/** Base shape: all keys required. */
type CreateArgsTypeBase<T extends readonly WorkflowArgument[]> = {
  [K in ExtractKeys<T>]: FindArg<T, K> extends { type: "flag" }
    ? boolean
    : string;
};
/** Flag args are optional so callers can omit them (default false). */
export type CreateArgsType<T extends readonly WorkflowArgument[]> = Omit<
  CreateArgsTypeBase<T>,
  FlagKeys<T>
> &
  Partial<Pick<CreateArgsTypeBase<T>, FlagKeys<T>>>;

/**
 * Simple checklist object. Machines should append one to the list for each
 * state. If a state invokes another machine, add its checklist output as subitems
 * to create a recursively generated checklist tree.
 */
export interface ChecklistItem {
  description: string;
  subitems?: ChecklistItem[];
}

/**
 * Required or optional argument for the workflow, in a format the CLI tool (or other program) can use.
 */
export interface WorkflowArgument {
  name: string;
  description?: string;

  /**
   * When "flag", the argument is optional and passed as e.g. --upload or --no-upload.
   * Default is "string" (required positional).
   */
  type?: "string" | "flag";

  /**
   * When generating an example checklist, this is the value that will be provided.
   */
  exampleValue?: string;
}

// general types

export interface ActionParam<C, E extends AnyEventObject> {
  context: C;
  event: E;
}

/**
 * The agent to use for the workflow.
 */
export type AgentCLI = "cursor-agent" | "mock-agent";

/**
 * When in "run" mode, specify which agent to use.
 */
export interface AgentConfig {
  cli: AgentCLI;
  sessionId?: string;
  totalTimeMs: number;
}

export type VersionControlMode = "git";

/**
 * Inputs every workflow machine receives.
 */
export interface WorkflowInput {
  workflowId?: string;

  agentConfig?: AgentConfig;

  runMode?: WorkflowExecutionMode;

  prompt?: string;

  templateFiles?: Record<string, string>;

  copiedFiles?: Record<string, string>;

  docFiles?: Record<string, string>;

  cwd?: string;

  manageVersionControl?: VersionControlMode;

  skipTodos?: boolean;
}

/**
 * Outputs every workflow machine returns.
 * @internal
 */
export interface WorkflowOutput {
  /**
   * Short descriptions of every step taken in the workflow. Can be used
   * either to generate a sample checklist for a workflow, or a summary
   * of the work done by a completed workflow. Workflows build these recursively.
   */
  checklist: ChecklistItem;

  copiedFiles?: Record<string, string>;

  newCwd?: string;

  agentConfig?: AgentConfig;
}

/**
 * The mode to run the workflow in.
 *
 * ## Dry
 * Runs the workflow as much as possible without making any file changes, running any commands, or prompting. Also tests the workflow inputs and starting cwd.
 * ## Script
 * Skip prompts and TODO checks, just run commands and copy template files. Useful for debugging those, it's recommended you run this at least once before running in "print" or "run" modes, to make sure the agent doesn't get tripped up by the automations the workflow itself performs.
 * ## Print
 * Print out logs and prompts, halt the machine at prompts. The original execution mode which integrates well with any agent, but lacks guarantees.
 * ## Run
 * Invert control from "print": the tool invokes the agent. If the workflow tool exits successfully, the workflow has been completed successfully.
 * ## Checklist
 * Similar to "dry", but uses the example values for inputs and does not do anything that depends on cwd, basically just runs the workflow to generate a generic checklist.
 */
export type WorkflowExecutionMode =
  | "dry"
  | "script"
  | "print"
  | "run"
  | "checklist";

/**
 * Context shared across all workflow machines.
 *
 * @internal
 */
export interface WorkflowContext {
  workflowId: string;

  agentConfig?: AgentConfig;

  /**
   * Short descriptions of every step taken in the workflow. Can be used
   * either to generate a sample checklist for a workflow, or a summary
   * of the work done by a completed workflow. Workflows build these recursively.
   */
  checklist: ChecklistItem[];

  /**
   * Optional prompt to be printed above every step prompt. Use to remind the
   * agent what the workflow is for, especially if it's a long one.
   */
  prompt?: string;

  /**
   * The mode to run the workflow in.
   * - "dry": do not print out logs or prompts, do not halt, just run the whole workflow and return the output. Useful for getting a checklist.
   * - "checklist": similar to "dry", but uses the example values for inputs and does not do anything that depends on cwd, basically just runs the workflow to generate a generic checklist.
   * - "print": print out logs and prompts, halt at prompts. "Normal" execution mode.
   * - "script": skip prompts and checks, just run command and copy steps. Useful for debugging templates and scripts.
   * - "run": runs the workflow at the top level, so it invokes agents, rather than agents invoking the tool. agentConfig is included in this mode.
   */
  runMode: WorkflowExecutionMode;

  templateFiles?: Record<string, string>;

  /**
   * The key is the id of the file, and the value is the absolute path to the file.
   */
  copiedFiles?: Record<string, string>;

  docFiles?: Record<string, string>;

  cwd: string;

  /**
   * Opt in to having the workflow tool check git changes are expected, and commit them if they are. If they aren't, the workflow tool prompts the agent to justify its changes, and either commit or revert them.
   *
   * This field is ignored in "dry", "checklist", and "script" modes.
   */
  manageVersionControl?: VersionControlMode;

  skipTodos?: boolean;
}

export type WorkflowActionFunction<
  C extends MachineContext,
  E extends AnyEventObject,
  Params,
> = ActionFunction<
  C,
  E,
  E,
  Params,
  {
    src: "noop";
    logic: PromiseActorLogic<unknown, NonReducibleUnknown, any>;
    id: string | undefined;
  },
  Values<any>,
  never,
  never,
  E
>;

export interface PromptParam {
  msg: string;
  context: WorkflowContext;
}

export interface PromptResult {
  code: number | null;
  sessionId?: string;
  shouldContinue: boolean;
}
