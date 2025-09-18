import {
  PromptStepMachine,
  CommandStepMachine,
  DocStepMachine,
  defineWorkflow,
  step,
  CopyStepMachine,
  UpdateStepMachine,
} from "@saflib/workflows";
import path from "path";

const input = [
  {
    name: "path",
    description: "The path to the schema file to update",
    exampleValue: "./schemas/example.ts",
  },
] as const;

interface UpdateSchemaWorkflowContext {
  name: string;
  targetDir: string;
  path: string;
}

export const UpdateSchemaWorkflowDefinition = defineWorkflow<
  typeof input,
  UpdateSchemaWorkflowContext
>({
  id: "drizzle/update-schema",

  description: "Update a drizzle/sqlite3 schema.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const name = path.basename(input.path);
    const targetDir = path.dirname(input.path);
    return {
      name,
      targetDir,
      path: input.path,
    };
  },

  templateFiles: {
    schema: path.join(import.meta.dirname, "templates/schema.ts"),
  },

  docFiles: {
    schemaDoc: path.join(import.meta.dirname, "../docs/02-schema.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: path.join(context.targetDir, "schemas"),
    })),

    step(DocStepMachine, () => ({
      docId: "schemaDoc",
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "schema",
      promptMessage: `Update ${context.path} to add the new table.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    step(PromptStepMachine, () => ({
      promptText: `If any new tables were created, make sure to add the inferred types to \`./types.ts\` so they're exported in \`./index.ts\`.`,
    })),
  ],
});
