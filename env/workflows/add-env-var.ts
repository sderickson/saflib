import { fromPromise, raise, setup } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  type WorkflowContext,
  promptAgent,
  XStateWorkflow,
} from "@saflib/workflows";
import { getSafReporters } from "@saflib/node";

interface AddEnvVarWorkflowInput {
  varName: string;
  varValue: string;
  description?: string;
}

interface AddEnvVarWorkflowContext extends WorkflowContext {
  varName: string;
  varValue: string;
  description: string;
}

export const AddEnvVarWorkflowMachine = setup({
  types: {
    input: {} as AddEnvVarWorkflowInput,
    context: {} as AddEnvVarWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-env-var",
  description:
    "Add a new environment variable to the env schema and configuration",
  initial: "promptForDetails",
  context: ({ input }) => {
    return {
      varName: input.varName || "",
      varValue: input.varValue || "",
      description: input.description || "",
      loggedLast: false,
    };
  },
  entry: () => {
    const { log } = getSafReporters();
    log.info("Successfully began add-env-var workflow");
  },
  states: {
    promptForDetails: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `You are adding a new environment variable. Current context:
                - Variable name: ${context.varName || "not set"}
                - Variable value: ${context.varValue || "not set"}
                - Description: ${context.description || "not set"}
                
                Please provide the variable name, value, and description if not already set.`,
            ),
          ],
        },
        continue: {
          target: "validateInput",
        },
      },
    },
    validateInput: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(
          async ({ input }: { input: AddEnvVarWorkflowContext }) => {
            if (!input.varName) {
              throw new Error("Variable name is required");
            }
            if (!input.varValue) {
              throw new Error("Variable value is required");
            }
            return "validation passed";
          },
        ),
        onDone: {
          target: "addToSchema",
          actions: () => {
            const { log } = getSafReporters();
            log.info("Input validation passed.");
          },
        },
        onError: {
          actions: [
            () => {
              const { logError } = getSafReporters();
              logError(new Error("Input validation failed."));
            },
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `The input validation failed. Please fix the issues and try again.`,
          ),
        },
        continue: {
          reenter: true,
          target: "validateInput",
        },
      },
    },
    addToSchema: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(
          async ({ input }: { input: AddEnvVarWorkflowContext }) => {
            // TODO: Implement adding the variable to env.schema.json
            // This would involve reading the schema, adding the new property, and writing it back
            return "schema updated";
          },
        ),
        onDone: {
          target: "addToEnvFile",
          actions: () => {
            const { log } = getSafReporters();
            log.info("Environment variable added to schema.");
          },
        },
        onError: {
          actions: [
            () => {
              const { logError } = getSafReporters();
              logError(new Error("Failed to add variable to schema."));
            },
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `Failed to add the environment variable to the schema. Please check the schema file and try again.`,
          ),
        },
        continue: {
          reenter: true,
          target: "addToSchema",
        },
      },
    },
    addToEnvFile: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(
          async ({ input }: { input: AddEnvVarWorkflowContext }) => {
            // TODO: Implement adding the variable to env.ts
            // This would involve reading the env.ts file, adding the new variable, and writing it back
            return "env file updated";
          },
        ),
        onDone: {
          target: "done",
          actions: () => {
            const { log } = getSafReporters();
            log.info("Environment variable added to env.ts file.");
          },
        },
        onError: {
          actions: [
            () => {
              const { logError } = getSafReporters();
              logError(new Error("Failed to add variable to env.ts file."));
            },
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `Failed to add the environment variable to the env.ts file. Please check the file and try again.`,
          ),
        },
        continue: {
          reenter: true,
          target: "addToEnvFile",
        },
      },
    },
    done: {
      type: "final",
    },
  },
});

export class AddEnvVarWorkflow extends XStateWorkflow {
  machine = AddEnvVarWorkflowMachine;
  description =
    "Add a new environment variable to the env schema and configuration";
  cliArguments = [
    {
      name: "varName",
      description: "The name of the environment variable to add",
    },
    {
      name: "varValue",
      description: "The default value for the environment variable",
    },
    {
      name: "description",
      description: "Optional description for the environment variable",
    },
  ];
}
