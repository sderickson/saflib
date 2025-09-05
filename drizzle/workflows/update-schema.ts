import {
  PromptStepMachine,
  CommandStepMachine,
  DocStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "path";

const input = [] as const;

interface UpdateSchemaWorkflowContext {}

export const UpdateSchemaWorkflowDefinition = defineWorkflow<
  typeof input,
  UpdateSchemaWorkflowContext
>({
  id: "drizzle/update-schema",

  description: "Update a drizzle/sqlite3 schema.",

  input,

  sourceUrl: import.meta.url,

  context: () => ({}),

  templateFiles: {},

  docFiles: {
    schemaDoc: path.join(import.meta.dirname, "../docs/02-schema.md"),
  },

  steps: [
    step(DocStepMachine, () => ({
      docId: "schemaDoc",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Find the right schema file in this folder and update it based on the spec.`,
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
