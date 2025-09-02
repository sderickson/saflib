import { createActor, setup } from "xstate";
const machine = setup({
  types: {
    input: {} as { foo: string },
    context: {} as { bar: string },
  },
}).createMachine({
  id: "foo",
  context: ({ input }) => ({
    bar: input.foo,
  }),
  initial: "bar",
  states: {
    bar: {
      on: {
        baz: "baz",
      },
    },
  },
});

interface Context {
  baz: string;
}

const step: Step<typeof machine> = {
  actor: machine,
  input: { foo: "bar" },
};

const actor = createActor(machine, { input: { foo: "bar" } });

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
 * Helper type to extract the input type from different types of actors
 */
type ActorInput<T> =
  T extends Promise<infer U>
    ? U
    : T extends { input: infer I }
      ? I
      : T extends { send: (event: infer E) => void }
        ? E
        : T extends { getSnapshot: () => infer S }
          ? S
          : any;

/**
 * Common types of actors that can be used in workflows
 */
type WorkflowActor =
  | Promise<any>
  | { input: any; send: (event: any) => void; getSnapshot: () => any }
  | { send: (event: any) => void; getSnapshot: () => any }
  | { getSnapshot: () => any };

/**
 * A step in a workflow with an actor and its corresponding input
 */
type Step<Actor extends WorkflowActor> = {
  actor: Actor;
  input: ActorInput<Actor>;
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

  steps: Array<Step<WorkflowActor>>;
}
