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
    const p = path.join(input.cwd, input.path);
    const name = path.basename(p).split(".")[0];
    const targetDir = path.dirname(p);
    console.log({
      name,
      targetDir,
      path: p,
    });
    return {
      name,
      targetDir,
      path: p,
    };
  },

  templateFiles: {
    schema: path.join(
      import.meta.dirname,
      "templates/schemas/template-file.ts",
    ),
  },

  docFiles: {
    schemaDoc: path.join(import.meta.dirname, "../docs/02-schema.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(DocStepMachine, () => ({
      docId: "schemaDoc",
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "schema",
      promptMessage: `Update ${context.path} to add the new table, or modify it.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    step(PromptStepMachine, () => ({
      promptText: `If any new tables were created, make sure to export everything from the new schema file in \`./index.ts\`.`,
    })),
  ],
});
