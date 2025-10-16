import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  PromptStepMachine,
  type ParsePathOutput,
  type ParsePackageNameOutput,
  parsePackageName,
  parsePath,
  makeLineReplace,
  getPackageName,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates/schemas");

const input = [
  {
    name: "name",
    description: "The name of the schema to create (e.g., 'user' or 'product')",
    exampleValue: "example",
  },
] as const;

interface AddSchemaWorkflowContext
  extends ParsePackageNameOutput,
    ParsePathOutput {}

export const AddSchemaWorkflowDefinition = defineWorkflow<
  typeof input,
  AddSchemaWorkflowContext
>({
  id: "openapi/add-schema",

  description: "Add a new schema to an existing OpenAPI specification package",

  checklistDescription: ({ groupName }) =>
    `Add a new ${groupName} schema to the OpenAPI specification.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const schemaPath = `./schemas/${input.name}.yaml`;

    return {
      ...parsePackageName(getPackageName(input.cwd), {}),
      ...parsePath(schemaPath, {
        requiredSuffix: ".yaml",
        cwd: input.cwd,
        requiredPrefix: "./schemas/",
      }),
    };
  },

  templateFiles: {
    schema: path.join(sourceDir, "template-file.yaml"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "schema",
      promptMessage: `Update **${context.targetName}** to define the schema for the ${context.groupName} resource.
      
      Replace the template properties with actual properties for your schema:
      - Define the object properties and their types
      - Add appropriate descriptions and examples
      - Set required fields
      - Consider validation rules and constraints
      - For nullable enums, make sure to include null in the enum list otherwise the validator will disallow null values.`,
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
