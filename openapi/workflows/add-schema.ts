import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  type ParsePathOutput,
  type ParsePackageNameOutput,
  parsePackageName,
  parsePath,
  makeLineReplace,
  getPackageName,
} from "@saflib/workflows";
import { existsSync } from "node:fs";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description: "The name of the schema (e.g., 'user' or 'product')",
    exampleValue: "example",
  },
] as const;

interface OpenApiSchemaWorkflowContext
  extends ParsePackageNameOutput, ParsePathOutput {}

export const OpenApiSchemaWorkflowDefinition = defineWorkflow<
  typeof input,
  OpenApiSchemaWorkflowContext
>({
  id: "openapi/schema",

  description: "Work on an OpenAPI schema",

  checklistDescription: ({ targetName }) => `Work on the ${targetName} schema.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const schemaPath = `./schemas/${input.name}.yaml`;
    let packageName = "@mock/package-openapi";
    if (existsSync(path.join(input.cwd, "package.json"))) {
      packageName = getPackageName(input.cwd);
    }
    return {
      ...parsePackageName(packageName, {}),
      ...parsePath(schemaPath, {
        requiredSuffix: ".yaml",
        cwd: input.cwd,
        requiredPrefix: "./schemas/",
      }),
      targetDir: input.cwd,
    };
  },

  templateFiles: {
    schema: path.join(sourceDir, "./schemas/__target-name__.yaml"),
    error: path.join(sourceDir, "./schemas/error.yaml"),
    openapi: path.join(sourceDir, "openapi.yaml"),
    index: path.join(sourceDir, "index.ts"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ["./dist/**"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "schema",
      promptMessage: `Update **${context.targetName}**
      - Add or update object properties and their types
      - Include appropriate descriptions and examples with new or updated properties
      - Update the required property as necessary
      - Use type: string for id and reference fields (do not use format: uuid; we use short ids from generateShortId)
      - For nullable enums, make sure to include null in the enum list otherwise the validator will disallow null values.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-specs", "generate"],
    })),

    step(CommandStepMachine, () => ({
      command: "npx",
      args: ["tsc", "--noEmit"],
    })),
  ],
});
