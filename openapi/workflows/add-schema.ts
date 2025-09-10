import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  PromptStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates/schemas");

const input = [
  {
    name: "name",
    description: "The name of the schema to create (e.g., 'user' or 'product')",
    exampleValue: "example-schema",
  },
] as const;

interface AddSchemaWorkflowContext {
  name: string;
  targetDir: string;
  schemaFileName: string;
}

export const AddSchemaWorkflowDefinition = defineWorkflow<
  typeof input,
  AddSchemaWorkflowContext
>({
  id: "openapi/add-schema",

  description: "Add a new schema to an existing OpenAPI specification package",

  checklistDescription: ({ name }) =>
    `Add a new ${name} schema to the OpenAPI specification.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = input.cwd;
    const schemaFileName = `${input.name}.yaml`;

    return {
      name: input.name,
      targetDir,
      schemaFileName,
    };
  },

  templateFiles: {
    schema: path.join(sourceDir, "template-file.yaml"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: path.join(context.targetDir, "schemas"),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "schema",
      promptMessage: `Update **${context.schemaFileName}** to define the schema for the ${context.name} resource.
      
      Replace the template properties with actual properties for your schema:
      - Define the object properties and their types
      - Add appropriate descriptions and examples
      - Set required fields
      - Consider validation rules and constraints`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Add the schema to the openapi.yaml file in the components.schemas section.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-specs", "generate"],
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update the index.ts file to export the new schema from \`components["schemas"]\`.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npx",
      args: ["tsc", "--noEmit"],
    })),
  ],
});
