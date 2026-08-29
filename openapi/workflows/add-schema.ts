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
import { templatesProductRoot } from "@saflib/templates";
import { existsSync } from "node:fs";
import path from "node:path";

const specRoot = path.join(templatesProductRoot, "service", "spec");
const schemaStub = path.join(specRoot, "schemas", "__target-name__.yaml");
/** Live openapi.yaml — schema-components area holds the stub; CopyStep upserts it. */
const openapiLive = path.join(specRoot, "openapi.yaml");

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
    schema: schemaStub,
    openapi: openapiLive,
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
      - For nullable fields use OpenAPI 3.1 forms: \`type: [string, "null"]\`, or \`oneOf: [{ type: "null" }, { \$ref: … }]\` for objects. For nullable enums, include null in the enum list (or use a type/enum union) so the validator allows null.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    step(CommandStepMachine, () => ({
      command: "npx",
      args: ["tsc", "--noEmit"],
    })),
  ],
});
