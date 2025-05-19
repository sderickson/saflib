import { fromPromise, raise, setup } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  logInfo,
  type WorkflowContext,
  logError,
  promptAgent,
  XStateWorkflow,
} from "@saflib/workflows";

interface ToDoWorkflowInput {}

interface ToDoWorkflowContext extends WorkflowContext {
  foo: string;
}

export const ToDoWorkflowMachine = setup({
  types: {
    input: {} as ToDoWorkflowInput,
    context: {} as ToDoWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "to-do",
  description: "TODO",
  initial: "examplePromptState",
  context: (_) => {
    return {
      foo: "bar",
      loggedLast: false,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    examplePromptState: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `This is a prompt state. It will not continue until the agent triggers the "continue" event. You can incorporate the context into the prompt if you need to like this: ${context.foo}`,
            ),
          ],
        },
        continue: {
          target: "exampleAsyncWorkState",
        },
      },
    },
    exampleAsyncWorkState: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }: { input: ToDoWorkflowContext }) => {
          // This promise can do async work such as calling an npm script.
          // It should reject if the work fails.
          return "success";
        }),
        onDone: {
          target: "done",
          actions: logInfo(() => `Work completed successfully.`), // use logInfo to communicate to the agent what is happening.
        },
        onError: {
          actions: [
            logError(() => `Work failed.`), // use logError to communicate to the agent what is happening.
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `Normally, this state will complete itself and not require agentic intervention. However, if the execution fails, the agent will be prompted with this string to fix the problem.`,
          ),
        },
        continue: {
          // when the agent is done fixing the issue, they'll trigger the workflow tool to "continue" at which point the work will be retried.
          reenter: true,
          target: "exampleAsyncWorkState",
        },
      },
    },
    done: {
      // there should always be a "done" state that is a final state.
      type: "final",
    },
  },
});

export class ToDoWorkflow extends XStateWorkflow {
  machine = ToDoWorkflowMachine;
  description = "TODO";
  cliArguments = [];
}
