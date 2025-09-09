import {
  type AnyEventObject,
  type AnyStateMachine,
  type Values,
  type NonReducibleUnknown,
  type ActionFunction,
  type InputFrom,
  type PromiseActorLogic,
  type MachineContext,
  type AnyActorRef,
} from "xstate";

/**
 * A step in a workflow with an actor and its corresponding input.
 */
export type WorkflowStep<C, M extends AnyStateMachine> = {
  machine: M;
  input: (arg: { context: C & WorkflowContext }) => InputFrom<M>;
};

/**
 * An interface that includes the inputs, files, steps, and everything else that makes up a workflow. Can be used to create an XState machine which can be used in other workflows, and an XStateWorkflowRunner which will execute just the workflow itself.
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
}

type ArrayElementType<T extends readonly unknown[]> = T[number];
type ExtractKeys<T extends readonly { name: string }[]> =
  ArrayElementType<T>["name"];
export type CreateArgsType<T extends readonly { name: string }[]> = {
  [K in ExtractKeys<T>]: string;
};

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
 * Required argument for the workflow, in a format the CLI tool (or other program) can use.
 */
export interface WorkflowArgument {
  name: string;
  description?: string;

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
 * Inputs every workflow machine receives.
 */
export interface WorkflowInput {
  /**
   * Flag to skip all execution of the workflow. Used mainly to get a checklist.
   */
  dryRun?: boolean;

  systemPrompt?: string;

  rootRef?: AnyActorRef;

  templateFiles?: Record<string, string>;

  copiedFiles?: Record<string, string>;

  docFiles?: Record<string, string>;

  cwd?: string;
}

/**
 * Outputs every workflow machine returns.
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
}

/**
 * Context shared across all workflow machines.
 */
export interface WorkflowContext {
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
  systemPrompt?: string;

  /**
   * Flag to skip all execution of the workflow. Use to return before doing things
   * like file operations. This is necessary to get a checklist from a workflow
   * without actually operating it.
   */
  dryRun?: boolean;

  /**
   * Currently unused. I had a plan to use this to orchestrate halt events, or perhaps a mutex setup so that async work (such as Promise actors) can communicate to the runner that there's async work happening and the workflow should wait until it's done before exiting the program or whatever the runner will end up doing. But I've run into a few problems including that the ref doesn't properly get unserialized (possibly because it's the root node?), and I can't just send a signal directly to a consistently named actor (I tried passing "workflow-actor" as the id when kicking off and dehydrating, no dice).
   *
   * I may futz with this again later, but it seems unlikely to work. In the meantime, I'm polling with "pollingWaitFor".
   */
  rootRef: AnyActorRef;

  templateFiles?: Record<string, string>;

  /**
   * The key is the id of the file, and the value is the absolute path to the file.
   */
  copiedFiles?: Record<string, string>;

  docFiles?: Record<string, string>;

  cwd: string;
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
