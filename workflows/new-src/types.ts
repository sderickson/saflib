import { type AnyStateMachine, type InputFrom } from "xstate";
import type { CLIArgument } from "../src/types.ts";
import type { WorkflowContext } from "../src/xstate.ts";

/**
 * A step in a workflow with an actor and its corresponding input.
 */
export type Step<C, M extends AnyStateMachine> = {
  machine: M;
  input: (arg: { context: C & WorkflowContext }) => InputFrom<M>;
};

/**
 * A workflow definition. Can be used to create an XState machine which, when run, will execute the workflow.
 */
export interface Workflow<I extends readonly CLIArgument[], C> {
  input: I;
  context: (arg: { input: CreateArgsType<I> }) => C;
  id: string;
  description: string;

  /**
   * The key is the id to be used in the machine, and the value is the absolute path to the template file.
   */
  templateFiles: Record<string, string>;

  /**
   * The key is the id to b e used in the machine, and the value is the absolute path to the doc file.
   */
  docFiles: Record<string, string>;

  steps: Array<Step<C, AnyStateMachine>>;
}

type ArrayElementType<T extends readonly unknown[]> = T[number];
type ExtractKeys<T extends readonly { name: string }[]> =
  ArrayElementType<T>["name"];
export type CreateArgsType<T extends readonly { name: string }[]> = {
  [K in ExtractKeys<T>]: string;
};
