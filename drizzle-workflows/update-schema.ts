import path from "node:path";
import {
  defineWorkflow,
  step,
  parsePath,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runCommandStep,
  type CopyStepInput,
  type UpdateStepInput,
  type CommandStepInput,
  type ParsePathOutput,
} from "@saflib/new-workflows";
import { templatesProductRoot, templatesSaflibRoot } from "@saflib/templates";

const dbRoot = path.join(templatesProductRoot, "service", "db");
const schemaStub = path.join(dbRoot, "schemas", "__group-name__.ts");
/** Live schema.ts — schema-exports area holds the stub; CopyStep upserts it. */
const schemaIndexLive = path.join(dbRoot, "schema.ts");
// `templatesSaflibRoot`, not `import.meta.dirname` — see add-query.ts's `refDoc`
// comment for why (container bind-mount root override).
const schemaDoc = path.join(templatesSaflibRoot, "drizzle", "docs", "02-schema.md");

interface UpdateSchemaInput {
  path: string;
  /** Include file metadata columns (blob_name, file_original_name, mimetype, size, etc.). */
  file?: boolean;
  /** Ignore the plural check for the schema name. */
  ignorePlural?: boolean;
  prompt?: string;
}

interface UpdateSchemaWorkflowContext extends ParsePathOutput {
  cwd: string;
  file: boolean;
  prompt?: string;
}

/**
 * Ported from `drizzle/workflows/update-schema.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 */
export const UpdateSchemaWorkflowDefinition = defineWorkflow<
  UpdateSchemaInput,
  UpdateSchemaWorkflowContext
>({
  id: "drizzle/update-schema",

  description: "Update a drizzle/sqlite3 schema.",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The path to the schema file to update (e.g. './schemas/example.ts')",
      },
      file: {
        type: "boolean",
        description:
          "Include file metadata columns (blob_name, file_original_name, mimetype, size, etc.)",
      },
      ignorePlural: {
        type: "boolean",
        description: "Ignore the plural check for the schema name",
      },
      prompt: {
        type: "string",
        description:
          "What the schema should actually look like, e.g. 'a todos table with title, completed, and due date'. Passed to the agent implementing it.",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => {
    const pathResult = parsePath(input.path, {
      requiredPrefix: "./schemas/",
      requiredSuffix: ".ts",
      cwd,
    });
    if (!input.ignorePlural && pathResult.targetName.endsWith("s")) {
      throw new Error(
        `Table name is ${pathResult.targetName} and should not be plural. Either change it to singular, or if it already is singular, use the ignorePlural flag.`,
      );
    }
    return {
      ...pathResult,
      cwd,
      file: input.file ?? false,
      prompt: input.prompt,
    };
  },

  steps: [
    step<CopyStepInput, UpdateSchemaWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        schema: schemaStub,
        schemaIndex: schemaIndexLive,
      },
      name: context.targetName,
      targetDir: context.cwd,
      lineReplace: makeLineReplace(context),
      flags: { file: context.file },
    })),

    step<UpdateStepInput, UpdateSchemaWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "schema",
      prompt: `${context.prompt ? `Task: ${context.prompt}\n\n` : ""}Update ${context.targetName}.ts to add the new table, or modify it.

Use generateShortId() from @saflib/drizzle for primary key id columns (not crypto.randomUUID()).
If there's a foreign key relationship, DO NOT set onDelete/onUpdate to cascade — leave the
Drizzle default (no action). Cascades are banned: drizzle-kit table recreates can wipe child
tables, and deletes must stay explicit in query code. Package tests enforce this via
assertNoFkCascades.

Please reference the documentation here for more information: ${schemaDoc}`,
    })),

    step<CommandStepInput, UpdateSchemaWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      errorPrompt: `If the interface and inferred types are not equal, you'll need to iteratively disable the new fields to find the one that is causing the issue. Run \`npm run typecheck\` again to see the error.

Some common issues:
* If one of the fields is a blob, you should specify a mode like "buffer" in the \`blob\` function.
* If the field may be null, the type should include \`... | null\`.`,
    })),

    step<CommandStepInput, UpdateSchemaWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    step<CommandStepInput, UpdateSchemaWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["test", "--", "no-fk-cascades"],
      errorPrompt: `FK CASCADE is not allowed in migrations or schemas. Remove onDelete/onUpdate: "cascade" and any ON DELETE/UPDATE CASCADE from generated SQL, then re-run generate. Delete related rows explicitly in query code instead.`,
    })),
  ],
});

export default UpdateSchemaWorkflowDefinition;
