import path from "node:path";
import {
  defineWorkflow,
  step,
  runCopyStep,
  runUpdateStep,
  runCommandStep,
  makeLineReplace,
  type CopyStepInput,
  type UpdateStepInput,
  type CommandStepInput,
} from "@saflib/new-workflows";
import { packageStubRoot } from "@saflib/templates";

const sourceDir = packageStubRoot;

interface AddEnvVarInput {
  /** The name of the environment variable (in all upper case, e.g., 'API_KEY' or 'DATABASE_URL'). */
  name: string;
  /** What this variable is for, e.g. "the API key for the Stripe integration". */
  prompt?: string;
}

interface AddEnvVarContext {
  cwd: string;
  name: string;
  variableName: string;
  prompt?: string;
}

/**
 * Ported from `env/workflows/add-env-var.ts` — same template, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 */
export const AddEnvVarWorkflowDefinition = defineWorkflow<AddEnvVarInput, AddEnvVarContext>({
  id: "env/add-var",

  description:
    "Add a new environment variable to the schema and generate the corresponding TypeScript types",

  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "The name of the environment variable (in all upper case, e.g., 'API_KEY' or 'DATABASE_URL')",
      },
      prompt: {
        type: "string",
        description:
          "What this variable is for, e.g. 'the API key for the Stripe integration'. Passed to the agent implementing it.",
      },
    },
    required: ["name"],
  },

  context: ({ input, cwd }) => {
    const variableName = input.name.toUpperCase();
    return { cwd, name: input.name, variableName, prompt: input.prompt };
  },

  steps: [
    step<CopyStepInput, AddEnvVarContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        schema: path.join(sourceDir, "env.schema.json"),
      },
      name: context.name,
      targetDir: context.cwd,
      lineReplace: makeLineReplace(context),
    })),

    step<UpdateStepInput, AddEnvVarContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "schema",
      prompt: `${context.prompt ? `Task: ${context.prompt}\n\n` : ""}Add the environment variable '${context.variableName}' to the env.schema.json file.

      Add it to the properties object with an appropriate type and description. If it is effectively a boolean, use the enum type with values 'true', 'false', and ''.`,
    })),

    step<CommandStepInput, AddEnvVarContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install", "@saflib/env"],
    })),

    step<CommandStepInput, AddEnvVarContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate"],
    })),
  ],
});

export default AddEnvVarWorkflowDefinition;
