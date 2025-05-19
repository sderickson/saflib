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

interface AddSpaWorkflowInput {}

interface AddSpaWorkflowContext extends WorkflowContext {
  foo: string;
}

export const AddSpaWorkflowMachine = setup({
  types: {
    input: {} as AddSpaWorkflowInput,
    context: {} as AddSpaWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "to-do",
  description: "TODO",
  initial: "getOriented",
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
        src: fromPromise(async () => {
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

export class AddSpaWorkflow extends XStateWorkflow {
  machine = AddSpaWorkflowMachine;
  description = "TODO";
  cliArguments = [];
}
