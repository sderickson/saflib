import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  type WorkflowContext,
  promptAgentComposer,
  runNpmCommandComposer,
  XStateWorkflow,
  contextFromInput,
  type WorkflowInput,
  outputFromContext,
} from "@saflib/workflows";
import path from "path";
import { existsSync } from "fs";
import { directoryFromMetaUrl } from "@saflib/dev-tools";

interface UpdateSchemaWorkflowInput extends WorkflowInput {}

interface UpdateSchemaWorkflowContext extends WorkflowContext {
  docPath: string;
}

export const UpdateSchemaWorkflowMachine = setup({
  types: {
    input: {} as UpdateSchemaWorkflowInput,
    context: {} as UpdateSchemaWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "update-schema",
  initial: "getOriented",
  context: ({ input }) => {
    const refDoc = path.resolve(
      directoryFromMetaUrl(import.meta.url),
      "../docs/02-schema.md",
    );
    const refDocAbsPath = path.resolve(process.cwd(), refDoc);
    if (!existsSync(refDocAbsPath)) {
      throw new Error(`Reference documentation not found: ${refDocAbsPath}`);
    }
    return {
      docPath: refDocAbsPath,
      ...contextFromInput(input),
      systemPrompt: `You are updating the schema of a database built off the @saflib/drizzle package. This includes following best practices and generating migration files.`,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    ...promptAgentComposer<UpdateSchemaWorkflowContext>({
      promptForContext: ({ context }) =>
        `Review the project spect, and read the guidelines for tables and columns in the schema doc.

* Schema doc: ${context.docPath}
* Project spec: The user should have already provided this. Ask for it if they haven't.`,
      stateName: "getOriented",
      nextStateName: "changingSchema",
    }),

    ...promptAgentComposer<UpdateSchemaWorkflowContext>({
      promptForContext: () =>
        `Find the right schema file in this folder and update it based on the spec.`,
      stateName: "changingSchema",
      nextStateName: "generatingMigrations",
    }),

    ...runNpmCommandComposer({
      command: "run generate",
      stateName: "generatingMigrations",
      nextStateName: "exportTypes",
    }),

    ...promptAgentComposer<UpdateSchemaWorkflowContext>({
      promptForContext: () =>
        `If any new tables were created, make sure to add the inferred types to \`./types.ts\` so they're exported in \`./index.ts\`.`,
      stateName: "exportTypes",
      nextStateName: "done",
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class UpdateSchemaWorkflow extends XStateWorkflow {
  machine = UpdateSchemaWorkflowMachine;
  description = "Update a drizzle/sqlite3 schema.";
  cliArguments = [];
  sourceUrl = import.meta.url;
}
