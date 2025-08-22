import { setup } from "xstate";
import {
  type WorkflowInput,
  workflowActionImplementations,
  workflowActors,
  logInfo,
  XStateWorkflow,
  copyTemplateStateFactory,
  updateTemplateFileFactory,
  runNpmCommandFactory,
  type TemplateWorkflowContext,
  contextFromInput,
  outputFromContext,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface AddEnvVarWorkflowInput extends WorkflowInput {
  name: string;
}

interface AddEnvVarWorkflowContext extends TemplateWorkflowContext {
  variableName: string;
  schemaPath: string;
}

export const AddEnvVarWorkflowMachine = setup({
  types: {
    input: {} as AddEnvVarWorkflowInput,
    context: {} as AddEnvVarWorkflowContext,
  },
  actions: {
    ...workflowActionImplementations,
  },
  actors: workflowActors,
}).createMachine({
  id: "add-env-var",
  initial: "copyTemplate",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "add-env-vars");
    const targetDir = process.cwd();
    const variableName = input.name.toUpperCase();

    return {
      name: input.name,
      pascalName: input.name.charAt(0).toUpperCase() + input.name.slice(1),
      variableName,
      sourceDir,
      targetDir,
      schemaPath: path.join(targetDir, "env.schema.json"),
      ...contextFromInput(input),
    };
  },
  entry: logInfo("Successfully began add-env-var workflow"),
  states: {
    ...copyTemplateStateFactory({
      stateName: "copyTemplate",
      nextStateName: "updateSchema",
    }),

    ...updateTemplateFileFactory<AddEnvVarWorkflowContext>({
      filePath: (context) => context.schemaPath,
      promptMessage: (context) =>
        `Please add the environment variable '${context.variableName}' to the env.schema.json file. Add it to the properties object with an appropriate type and description. If it is effectively a boolean, use the enum type with values 'true', 'false', and ''.`,
      stateName: "updateSchema",
      nextStateName: "installSaflibEnv",
    }),

    ...runNpmCommandFactory({
      command: "install @saflib/env",
      stateName: "installSaflibEnv",
      nextStateName: "generateEnv",
    }),

    ...runNpmCommandFactory({
      command: "exec saf-env generate",
      stateName: "generateEnv",
      nextStateName: "generateAllEnv",
    }),

    ...runNpmCommandFactory({
      command: "exec saf-env generate-all",
      stateName: "generateAllEnv",
      nextStateName: "done",
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class AddEnvVarWorkflow extends XStateWorkflow {
  sourceUrl = import.meta.url;
  machine = AddEnvVarWorkflowMachine;
  description =
    "Add a new environment variable to the schema and generate the corresponding TypeScript types";
  cliArguments = [
    {
      name: "name",
      description:
        "The name of the environment variable (in all upper case, e.g., 'API_KEY' or 'DATABASE_URL')",
      exampleValue: "EXAMPLE_ENV_VAR",
    },
  ];
}
