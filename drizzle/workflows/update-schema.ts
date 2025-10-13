import {
  PromptStepMachine,
  CommandStepMachine,
  DocStepMachine,
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
] as const;

const sourceDir = path.join(import.meta.dirname, "templates");

interface UpdateSchemaWorkflowContext extends ParsePathOutput {}

export const UpdateSchemaWorkflowDefinition = defineWorkflow<
  typeof input,
  UpdateSchemaWorkflowContext
>({
  id: "drizzle/update-schema",

  description: "Update a drizzle/sqlite3 schema.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePath(input.path, {
        requiredPrefix: "./schemas/",
        requiredSuffix: ".ts",
        cwd: input.cwd,
      }),
      targetDir: input.cwd,
    };
  },

  templateFiles: {
    schema: path.join(sourceDir, "schemas/__group-name__.ts"),
    schemaIndex: path.join(sourceDir, "schema.ts"),
  },

  docFiles: {
    schemaDoc: path.join(import.meta.dirname, "../docs/02-schema.md"),
  },

  manageGit: true,

  steps: [
    step(PromptStepMachine, ({ context }) => {
      return {
        promptText: `The table ends with "s". Table names should not be plural; if the table name is actually plural, please stop and rerun the workflow with a singular name. Otherwise, continue.`,
        skipIf: !context.targetName.endsWith("s"),
      };
    }),

    step(CopyStepMachine, ({ context }) => {
      return {
        name: context.targetName,
        targetDir: context.targetDir,
        lineReplace: makeLineReplace(context),
      };
    }),

    step(DocStepMachine, () => ({
      docId: "schemaDoc",
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "schema",
      promptMessage: `Update ${context.targetName}.ts to add the new table, or modify it.
      
      ${context.systemPrompt ? `More context: ${context.systemPrompt}` : ""}`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      promptOnError: `If the interface and inferred types are not equal, you'll need to iteratively disable the new fields to find the one that is causing the issue. Run \`npm run typecheck\` again to see the error.
      
      Some common issues:
      * If one of the fields is a blob, you should specify a mode like "buffer" in the \`blob\` function.
      * If the field may be null, the type should include \`... | null\`.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Check that everything in ${context.targetName}.ts is exported in the root \`./schema.ts\` file.
      
      Don't overthink this. Just check quickly and be done with it.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),
  ],
});
