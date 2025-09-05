import { type AnyStateMachine, type InputFrom } from "xstate";
import type { WorkflowArgument } from "../src/types.ts";
import type { WorkflowContext } from "../src/xstate.ts";

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
export interface WorkflowDefinition<I extends readonly WorkflowArgument[], C> {
  /**
   * The input specific to this workflow.
   */
  input: I;

  /**
   * The context specific to this workflow, generated from the input and available to use in each step.
   */
  context: (arg: { input: CreateArgsType<I> }) => C;

  /**
   * Unique id for the workflow, for invoking it with the CLI tool.
   */
  id: string;

  /**
   * Description of the workflow which will be shown in the CLI tool.
   */
  description: string;

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
