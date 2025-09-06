import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows-internal";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "add-env-vars");

const input = [
  {
    name: "name",
    description:
      "The name of the environment variable (in all upper case, e.g., 'API_KEY' or 'DATABASE_URL')",
    exampleValue: "EXAMPLE_ENV_VAR",
  },
] as const;

interface AddEnvVarWorkflowContext {
  name: string;
  variableName: string;
}

export const AddEnvVarWorkflowDefinition = defineWorkflow<
  typeof input,
  AddEnvVarWorkflowContext
>({
  id: "env/add-var",

  description:
    "Add a new environment variable to the schema and generate the corresponding TypeScript types",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const variableName = input.name.toUpperCase();

    return {
      name: input.name,
      variableName,
    };
  },

  templateFiles: {
    schema: path.join(sourceDir, "env.schema.json"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: process.cwd(),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "schema",
      promptMessage: `Add the environment variable '${context.variableName}' to the env.schema.json file.
      
      Add it to the properties object with an appropriate type and description. If it is effectively a boolean, use the enum type with values 'true', 'false', and ''.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/env"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate-all"],
    })),
  ],
});
