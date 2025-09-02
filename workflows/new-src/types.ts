import {
  //  setup,
  type AnyStateMachine,
  type InputFrom,
} from "xstate";

// const machine = setup({
//   types: {
//     input: {} as { foo: string },
//     context: {} as { bar: string },
//   },
// }).createMachine({
//   id: "foo",
//   context: ({ input }) => ({
//     bar: input.foo,
//   }),
//   initial: "bar",
//   states: {
//     bar: {
//       on: {
//         baz: "baz",
//       },
//     },
//   },
// });

// const step: Step<typeof machine> = {
//   machine: machine,
//   input: { foo: "bar" },
// };

/**
 * Required argument for the workflow, in a format the CLI tool (commander) can use.
 */
export interface CLIArgument {
  name: string;
  description?: string;

  /**
   * When generating an example checklist, this is the value that will be provided.
   */
  exampleValue?: string;
}

/**
 * A step in a workflow with an actor and its corresponding input
 */
type Step<Machine extends AnyStateMachine> = {
  machine: Machine;
  input: InputFrom<Machine>;
};

/**
 * A workflow definition. Can be used to create an XState machine which, when run, will execute the workflow.
 */
export interface Workflow<C extends Record<string, any>> {
  input: Array<CLIArgument>;
  context: () => C;
  id: string;
  description: string;

  /**
   * The key is the id to be used in the machine, and the value is the absolute path to the template file.
   */
  templateFiles: Record<string, string>;

  /**
   * The key is the id to be used in the machine, and the value is the absolute path to the doc file.
   */
  docFiles: Record<string, string>;

  steps: Array<Step<AnyStateMachine>>;
}
