import {
  defineWorkflow,
  step,
  runCopyStep,
  runUpdateStep,
  runCommandStep,
  parsePackageName,
  parsePath,
  makeLineReplace,
  getPackageName,
  type CopyStepInput,
  type UpdateStepInput,
  type CommandStepInput,
  type ParsePathOutput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { templatesProductRoot } from "@saflib/templates";
import { existsSync } from "node:fs";
import path from "node:path";

const specRoot = path.join(templatesProductRoot, "service", "spec");
const schemaStub = path.join(specRoot, "schemas", "__target-name__.yaml");
/** Live openapi.yaml — schema-components area holds the stub; CopyStep upserts it. */
const openapiLive = path.join(specRoot, "openapi.yaml");

interface OpenApiSchemaInput {
  name: string;
  /** What the schema should actually contain, e.g. "a recipe with a title, ingredients list, and steps". Passed to the agent implementing it. */
  prompt?: string;
}

interface OpenApiSchemaWorkflowContext extends ParsePackageNameOutput, ParsePathOutput {
  targetDir: string;
  prompt?: string;
}

/**
 * Ported from `openapi/workflows/add-schema.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 */
export const OpenApiSchemaWorkflowDefinition = defineWorkflow<
  OpenApiSchemaInput,
  OpenApiSchemaWorkflowContext
>({
  id: "openapi/schema",

  description: "Work on an OpenAPI schema",

  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "The name of the schema (e.g., 'user' or 'product')",
      },
      prompt: {
        type: "string",
        description:
          "What the schema should actually contain, e.g. 'a recipe with a title, ingredients list, and steps'. Passed to the agent implementing it.",
      },
    },
    required: ["name"],
  },

  context: ({ input, cwd }) => {
    const schemaPath = `./schemas/${input.name}.yaml`;
    let packageName = "@mock/package-openapi";
    if (existsSync(path.join(cwd, "package.json"))) {
      packageName = getPackageName(cwd);
    }
    return {
      ...parsePackageName(packageName, {}),
      ...parsePath(schemaPath, {
        requiredSuffix: ".yaml",
        cwd,
        requiredPrefix: "./schemas/",
      }),
      targetDir: cwd,
      prompt: input.prompt,
    };
  },

  steps: [
    step<CopyStepInput, OpenApiSchemaWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        schema: schemaStub,
        openapi: openapiLive,
      },
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step<UpdateStepInput, OpenApiSchemaWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "schema",
      prompt: `${context.prompt ? `Task: ${context.prompt}\n\n` : ""}Update **${context.targetName}**
      - Add or update object properties and their types
      - Include appropriate descriptions and examples with new or updated properties
      - Update the required property as necessary
      - Use type: string for id and reference fields (do not use format: uuid; we use short ids from generateShortId)
      - For nullable fields use OpenAPI 3.1 forms: \`type: [string, "null"]\`, or \`oneOf: [{ type: "null" }, { \$ref: … }]\` for objects. For nullable enums, include null in the enum list (or use a type/enum union) so the validator allows null.`,
    })),

    step<CommandStepInput, OpenApiSchemaWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    step<CommandStepInput, OpenApiSchemaWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "tsc", "--", "--noEmit"],
    })),
  ],
});

export default OpenApiSchemaWorkflowDefinition;
