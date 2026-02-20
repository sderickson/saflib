import {
  PromptStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  CopyStepMachine,
  UpdateStepMachine,
  type ParsePathOutput,
  parsePath,
  makeLineReplace,
} from "@saflib/workflows";
import path from "path";

const input = [
  {
    name: "path",
    description: "The path to the schema file to update",
    exampleValue: "./schemas/example.ts",
  },
  {
    name: "file",
    type: "flag" as const,
    description:
      "Include file metadata columns (blob_name, file_original_name, mimetype, size, etc.)",
  },
  {
    name: "ignorePlural",
    description: "Ignore the plural check for the schema name",
    type: "flag" as const,
    exampleValue: "false",
  },
] as const;

const sourceDir = path.join(import.meta.dirname, "templates");

interface UpdateSchemaWorkflowContext extends ParsePathOutput {
  file: boolean;
}

export const UpdateSchemaWorkflowDefinition = defineWorkflow<
  typeof input,
  UpdateSchemaWorkflowContext
>({
  id: "drizzle/update-schema",

  description: "Update a drizzle/sqlite3 schema.",

  checklistDescription: ({ targetName }) =>
    `Update the ${targetName}.ts file to add the new table, or modify it.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const pathResult = parsePath(input.path, {
      requiredPrefix: "./schemas/",
      requiredSuffix: ".ts",
      cwd: input.cwd,
    });
    if (!input.ignorePlural && pathResult.targetName.endsWith("s")) {
      throw new Error(
        `Table name is ${pathResult.targetName} and should not be plural. Either change it to singular, or if it already is singular, use the ignorePlural flag.`,
      );
    }
    return {
      ...pathResult,
      targetDir: input.cwd,
      file: input.file ?? false,
    };
  },

  templateFiles: {
    schema: path.join(sourceDir, "schemas/__group-name__.ts"),
    schemaIndex: path.join(sourceDir, "schema.ts"),
  },

  docFiles: {
    schemaDoc: path.join(import.meta.dirname, "../docs/02-schema.md"),
  },

  versionControl: {
    allowPaths: ["./migrations/**"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => {
      return {
        name: context.targetName,
        targetDir: context.targetDir,
        lineReplace: makeLineReplace(context),
        flags: { file: context.file },
      };
    }),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "schema",
      promptMessage: `Update ${context.targetName}.ts to add the new table, or modify it.

      If there's a foreign key relationship, DO NOT set it to cascade on delete.
      
      Please reference the documentation here for more information: ${context.docFiles?.schemaDoc}`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      promptOnError: `If the interface and inferred types are not equal, you'll need to iteratively disable the new fields to find the one that is causing the issue. Run \`npm run typecheck\` again to see the error.
      
      Some common issues:
      * If one of the fields is a blob, you should specify a mode like "buffer" in the \`blob\` function.
      * If the field may be null, the type should include \`... | null\`.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),
  ],
});
